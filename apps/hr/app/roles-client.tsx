"use client";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import * as XLSX from "xlsx";
import PermissionsPanel from "./permissions-panel";
import {
  parsePermissions,
  permissionModules,
  type PermissionKey,
} from "./access-permissions";
import InterfaceControls, { type Branding } from "./interface-controls";
import { uiText, type InterfaceLocale } from "./interface-locales";
import SelectionToolbar from "./selection-toolbar";
import PoliciesPanel, { type PolicyDocument } from "./policies-panel";
import VacationModelsPanel, {
  vacationBalance,
  type VacationModel,
} from "./vacation-models-panel";
import CalendarRestSummary from "./calendar-rest-summary";
import CalendarMovementsSummary from "./calendar-movements-summary";
import JobRolesPanel, { type JobRole } from "./job-roles-panel";
import BirthdaysPanel, { type BirthdayEntry } from "./birthdays-panel";
import FacialistSchedulePanel from "./facialist-schedule-panel";
import FacialistCoverageSummary from "./facialist-coverage-summary";
import CalendarVacationSummary from "./calendar-vacation-summary";
import CustomVacationPanel from "./custom-vacation-panel";
import EmployeeBiography from "./employee-biography";
import FacialistTodaySummary from "./facialist-today-summary";
import VacationBalanceHistory from "./vacation-balance-history";
type Member = {
  id: number;
  name: string;
  firstName: string | null;
  paternalSurname: string | null;
  maternalSurname: string | null;
  username: string | null;
  jobRole: string;
  email: string | null;
  invitedEmail: string | null;
  permissions: string;
  vacationModelId: number | null;
  birthday: string | null;
  isAdmin: boolean;
  isActive: boolean;
  branch: string;
  shift: string;
  restDay: string;
  restDay2: string;
  restType: string;
  restStartDate: string | null;
  restEndDate: string | null;
};
type Session = {
  id?: number;
  name: string;
  email: string;
  username?: string | null;
  role?: string;
  birthday?: string | null;
  permissions?: string;
  isAdmin?: boolean;
  status: string;
};
type Branch = {
  id: number;
  name: string;
  managerId: number | null;
  openingTime: string;
  closingTime: string;
};
type StaffRequest = {
  id: number;
  staffId: number;
  requestType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  attachmentKey: string | null;
  attachmentName: string | null;
  vacationModelId: number | null;
  createdAt: string;
};
type CalendarAbsence = Pick<
  StaffRequest,
  "id" | "staffId" | "requestType" | "startDate" | "endDate" | "status"
>;
type PermissionType = {
  id: number;
  name: string;
  requiresDocument: boolean;
  active: boolean;
};
type DailyAssignment = {
  id: number;
  staffId: number;
  workDate: string;
  branch: string;
  shift: string;
};
type ScheduleDraft = { branch: string; shift: string };
type BulkCredential = {
  id: number;
  name: string;
  username: string;
  temporaryPassword: string;
};
const branches = [
    "Mitikah",
    "Mitikah VIP",
    "Opatra",
    "Galerías Insurgentes",
    "Masaryk",
    "Parque Delta",
  ],
  shifts = ["Turno 1 · 10:00–18:00", "Turno 2 · 14:00–20:00"],
  days = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ],
  dayNames = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ],
  months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ],
  branchColors = [
    "#b8914a",
    "#d7bd73",
    "#8e6b2f",
    "#c9a75c",
    "#a47b32",
    "#e0ca8c",
    "#79591f",
    "#b8914a",
  ];
const defaultBranding: Branding = {
  brandName: "KEYSAR",
  brandSubtitle: "COSMETICS · GESTIÓN DE PERSONAL",
  logoName: null,
  logoUrl: null,
};
export default function RolesClient({ signOut }: { signOut: string }) {
  const [session, setSession] = useState<Session | null>(null),
    [members, setMembers] = useState<Member[]>([]),
    [branchList, setBranchList] = useState<Branch[]>([]),
    [requestList, setRequestList] = useState<StaffRequest[]>([]),
    [calendarAbsenceList, setCalendarAbsenceList] = useState<CalendarAbsence[]>(
      [],
    ),
    [dailyAssignments, setDailyAssignments] = useState<DailyAssignment[]>([]),
    [permissionTypeList, setPermissionTypeList] = useState<PermissionType[]>(
      [],
    ),
    [loading, setLoading] = useState(true),
    [claim, setClaim] = useState(""),
    [loginUsername, setLoginUsername] = useState(""),
    [firstName, setFirstName] = useState(""),
    [paternalSurname, setPaternalSurname] = useState(""),
    [maternalSurname, setMaternalSurname] = useState(""),
    [employeeEmail, setEmployeeEmail] = useState(""),
    [job, setJob] = useState("Vendedor"),
    [newRestDay, setNewRestDay] = useState("Domingo"),
    [newRestDay2, setNewRestDay2] = useState("Sin asignar"),
    [newRestType, setNewRestType] = useState("Fijo"),
    [newRestStart, setNewRestStart] = useState(""),
    [newRestEnd, setNewRestEnd] = useState(""),
    [password, setPassword] = useState(""),
    [generatedUsername, setGeneratedUsername] = useState(""),
    [message, setMessage] = useState(""),
    [tab, setTab] = useState<
      | "employees"
      | "personal"
      | "calendar"
      | "requests"
      | "vacations"
      | "branches"
      | "positions"
      | "facialists"
      | "birthdays"
      | "access"
      | "policies"
    >("employees"),
    [selectedId, setSelectedId] = useState(0),
    [editing, setEditing] = useState(false),
    [bulkCredentials, setBulkCredentials] = useState<BulkCredential[]>([]),
    [importing, setImporting] = useState(false),
    [monthDate, setMonthDate] = useState(new Date()),
    [scheduleDate, setScheduleDate] = useState(
      new Date().toISOString().slice(0, 10),
    ),
    [scheduleDraft, setScheduleDraft] = useState<Record<number, ScheduleDraft>>(
      {},
    ),
    [repeatScheduleOpen, setRepeatScheduleOpen] = useState(false),
    [repeatScheduleSource, setRepeatScheduleSource] = useState<"day" | "week">(
      "week",
    ),
    [savingSchedule, setSavingSchedule] = useState(false),
    [weekStart, setWeekStart] = useState(() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      const offset = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - offset);
      return d;
    }),
    [calendarView, setCalendarView] = useState<
      "weekly" | "fortnightly" | "monthly"
    >("weekly"),
    [helpOpen, setHelpOpen] = useState(false),
    [requestType, setRequestType] = useState("Permiso"),
    [requestStart, setRequestStart] = useState(""),
    [requestEnd, setRequestEnd] = useState(""),
    [requestReason, setRequestReason] = useState(""),
    [requestFile, setRequestFile] = useState<File | null>(null),
    [requestFormOpen, setRequestFormOpen] = useState(false),
    [requestStaffId, setRequestStaffId] = useState(0),
    [branchName, setBranchName] = useState(""),
    [branchManager, setBranchManager] = useState(0),
    [editingBranch, setEditingBranch] = useState(0),
    [authorizationFilter, setAuthorizationFilter] = useState("Todas"),
    [requestScope, setRequestScope] = useState<"current" | "date" | "history">(
      "current",
    ),
    [requestPeriodDate, setRequestPeriodDate] = useState(
      new Date().toISOString().slice(0, 10),
    ),
    [permissionView, setPermissionView] = useState<
      "authorizations" | "history" | "configuration"
    >("authorizations"),
    [historyPeriod, setHistoryPeriod] = useState<
      "week" | "fortnight" | "month"
    >("month"),
    [newPermissionName, setNewPermissionName] = useState(""),
    [newPermissionDocument, setNewPermissionDocument] = useState(false),
    [branding, setBranding] = useState<Branding>(defaultBranding),
    [locale, setLocale] = useState<InterfaceLocale>("es");
  const [policyDocuments, setPolicyDocuments] = useState<PolicyDocument[]>([]),
    [vacationModels, setVacationModels] = useState<VacationModel[]>([]),
    [jobRoleList, setJobRoleList] = useState<JobRole[]>([]),
    [birthdayEntries, setBirthdayEntries] = useState<BirthdayEntry[]>([]),
    [birthdayDraft, setBirthdayDraft] = useState(""),
    [birthdaySkipped, setBirthdaySkipped] = useState(false),
    [newVacationModelId, setNewVacationModelId] = useState(0),
    [branchOpening, setBranchOpening] = useState("10:00"),
    [branchClosing, setBranchClosing] = useState("20:00"),
    [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]),
    [selectedRequestIds, setSelectedRequestIds] = useState<number[]>([]),
    [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]),
    [lastUpdated, setLastUpdated] = useState(new Date()),
    [brandEditorSignal, setBrandEditorSignal] = useState(0),
    [editingOriginal, setEditingOriginal] = useState<Member | null>(null);
  async function load(silent = false) {
    if (!silent) setLoading(true);
    const r = await fetch("/api/app", { cache: "no-store" }),
      d = await r.json();
    setSession(d.session);
    setBranding(d.branding || defaultBranding);
    setMembers(d.staff || []);
    setBranchList(d.branches || []);
    setRequestList(d.requests || []);
    setCalendarAbsenceList(d.calendarAbsences || []);
    setDailyAssignments(d.assignments || []);
    setPermissionTypeList(d.permissionTypes || []);
    setPolicyDocuments(d.policyDocuments || []);
    setVacationModels(d.vacationModels || []);
    setJobRoleList(d.jobRoles || []);
    setBirthdayEntries(d.birthdays || []);
    setBirthdayDraft((current: string) => current || d.session?.birthday || "");
    if (!requestStaffId && d.staff?.find((member: Member) => !member.isAdmin))
      setRequestStaffId(d.staff.find((member: Member) => !member.isAdmin).id);
    if (!newVacationModelId && d.vacationModels?.[0])
      setNewVacationModelId(d.vacationModels[0].id);
    setLastUpdated(new Date());
    if (!d.session?.isAdmin && d.session?.status === "active") {
      const allowed = parsePermissions(d.session.permissions);
      if (tab === "access" || !allowed[tab as PermissionKey]?.view) {
        const first = permissionModules.find(
          (module) => allowed[module.key].view,
        );
        if (first) setTab(first.key);
      }
    }
    setLoading(false);
  }
  useEffect(() => {
    void load();
    const refresh = window.setInterval(() => void load(true), 60000);
    return () => {
      window.clearInterval(refresh);
    };
  }, []);
  async function act(payload: Record<string, unknown>) {
    const r = await fetch("/api/app", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
      raw = await r.text(),
      d = (() => {
        try {
          return raw ? JSON.parse(raw) : {};
        } catch {
          return {};
        }
      })();
    if (!r.ok) {
      setMessage(
        typeof d.error === "string"
          ? d.error
          : "No fue posible completar la solicitud. Intenta nuevamente.",
      );
      return null;
    }
    return d;
  }
  async function claimProfile() {
    setMessage("");
    const d = await act({
      action: "claim",
      username: loginUsername,
      code: claim,
    });
    if (d) {
      setClaim("");
      await load();
    }
  }
  async function logoutProfile() {
    await act({ action: "logout" });
    window.location.assign("/");
  }
  async function create() {
    if (!firstName.trim() || !paternalSurname.trim() || !maternalSurname.trim())
      return setMessage("Captura el nombre y ambos apellidos del empleado.");
    if (newRestDay2 !== "Sin asignar" && newRestDay === newRestDay2)
      return setMessage("Selecciona dos días de descanso diferentes.");
    if (newRestType === "Temporal" && (!newRestStart || !newRestEnd))
      return setMessage("Selecciona la vigencia del descanso temporal.");
    if (!newVacationModelId)
      return setMessage("Selecciona obligatoriamente un modelo de vacaciones.");
    const d = await act({
      action: "create",
      firstName,
      paternalSurname,
      maternalSurname,
      invitedEmail: employeeEmail,
      jobRole: job,
      branch: "Sin asignar",
      shift: "Sin asignar",
      restDay: newRestDay,
      restDay2: newRestDay2,
      restType: newRestType,
      restStartDate: newRestStart,
      restEndDate: newRestEnd,
      vacationModelId: newVacationModelId,
    });
    if (d) {
      setPassword(d.temporaryPassword);
      setGeneratedUsername(d.created.username);
      setFirstName("");
      setPaternalSurname("");
      setMaternalSurname("");
      setEmployeeEmail("");
      setNewRestDay("Domingo");
      setNewRestDay2("Sin asignar");
      setNewRestType("Fijo");
      setNewRestStart("");
      setNewRestEnd("");
      setMessage(
        "Cuenta creada. Copia y entrega directamente el usuario y la contraseña al empleado.",
      );
      await load();
      setSelectedId(d.created.id);
    }
  }
  async function saveMember(m: Member) {
    if (m.restDay2 !== "Sin asignar" && m.restDay === m.restDay2)
      return setMessage("Selecciona dos días de descanso diferentes.");
    if (m.restType === "Temporal" && (!m.restStartDate || !m.restEndDate))
      return setMessage("Selecciona la vigencia del descanso temporal.");
    const result = await act({
      action: "update",
      id: m.id,
      name: m.name,
      jobRole: m.jobRole,
      branch: m.branch,
      shift: m.shift,
      restDay: m.restDay,
      restDay2: m.restDay2,
      restType: m.restType,
      restStartDate: m.restStartDate || "",
      restEndDate: m.restEndDate || "",
      vacationModelId: m.vacationModelId,
    });
    if (!result) return;
    setEditing(false);
    setEditingOriginal(null);
    setMessage("Cambios guardados correctamente.");
    await load(true);
  }
  function localUpdate(
    id: number,
    key: keyof Member,
    value: string | number | null,
  ) {
    setMembers(members.map((x) => (x.id === id ? { ...x, [key]: value } : x)));
  }
  async function remove(m: Member) {
    if (!window.confirm(`¿Borrar definitivamente el perfil de ${m.name}?`))
      return;
    const d = await act({ action: "delete", id: m.id });
    if (d) {
      setSelectedId(0);
      setMessage("Perfil eliminado.");
      await load();
    }
  }
  async function toggleStaffStatus(m: Member) {
    const next = !m.isActive;
    const d = await act({ action: "staff_status", id: m.id, isActive: next });
    if (d) {
      setMessage(`${m.name} ahora está ${next ? "activo" : "inactivo"}.`);
      await load();
    }
  }
  async function regenerate(id: number) {
    const d = await act({ action: "regenerate", id });
    if (d) {
      setPassword(d.temporaryPassword);
      setGeneratedUsername(d.username || "");
      setInviteTarget(members.find((m) => m.id === id)?.invitedEmail || "");
      setMessage(
        "Nueva contraseña generada; comparte nuevamente el usuario y la contraseña.",
      );
      await load();
    }
  }
  function beginEdit(member: Member) {
    setSelectedId(member.id);
    setEditingOriginal(structuredClone(member));
    setEditing(true);
    setTab("personal");
  }
  function editFromDirectory(member: Member) {
    beginEdit(member);
  }
  function cancelEdit() {
    if (editingOriginal)
      setMembers((current) =>
        current.map((member) =>
          member.id === editingOriginal.id ? editingOriginal : member,
        ),
      );
    setEditingOriginal(null);
    setEditing(false);
  }
  function openEmployeeProfile(id: number) {
    const member = members.find((item) => item.id === id);
    if (member) beginEdit(member);
  }
  async function importEmployees(file: File) {
    setImporting(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" }),
        sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
        range: 3,
        defval: "",
      });
      const employees = rows
        .map((row) => ({
          firstName: String(row["Nombre"] || "").trim(),
          paternalSurname: String(row["Apellido paterno"] || "").trim(),
          maternalSurname: String(row["Apellido materno"] || "").trim(),
          invitedEmail: String(row["Correo electrónico"] || "")
            .trim()
            .toLowerCase(),
          jobRole: String(row["Puesto"] || "Vendedor").trim(),
          branch: String(row["Sucursal"] || "Sin asignar").trim(),
          shift: String(row["Turno"] || "Sin asignar").trim(),
          restDay: String(row["Día de descanso"] || "Sin asignar").trim(),
          restDay2: String(row["Día de descanso 2"] || "Sin asignar").trim(),
          restType: "Fijo",
          vacationModelId: vacationModels[0]?.id || null,
        }))
        .filter(
          (row) =>
            row.firstName &&
            row.paternalSurname &&
            row.maternalSurname &&
            row.invitedEmail !== "maria.lopez@empresa.com",
        );
      const result = await act({ action: "bulk_create", employees });
      if (result) {
        setBulkCredentials(result.credentials || []);
        setMessage(
          `${result.createdCount} empleados registrados${result.errorCount ? ` · ${result.errorCount} filas no se cargaron` : ""}.`,
        );
        await load();
      }
    } catch {
      setMessage(
        "No se pudo leer el archivo. Usa la plantilla de Excel sin cambiar los encabezados.",
      );
    } finally {
      setImporting(false);
    }
  }
  function downloadBulkCredentials() {
    const sheet = XLSX.utils.json_to_sheet(
      bulkCredentials.map((item) => ({
        Empleado: item.name,
        Usuario: item.username,
        "Contraseña temporal": item.temporaryPassword,
      })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Credenciales");
    XLSX.writeFile(workbook, "credenciales-empleados-keysar.xlsx");
  }
  function shiftTimes(m: Member) {
    return m.shift.includes("14:00") ? [14, 20] : [10, 18];
  }
  function pad(n: number) {
    return String(n).padStart(2, "0");
  }
  function compact(d: Date, h: number) {
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(h)}0000`;
  }
  function dateKey(d: Date) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function restDays(m: Member) {
    return [m.restDay, m.restDay2].filter(
      (day) => day && day !== "Sin asignar",
    );
  }
  function calendarUrl(m: Member) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    while (start.getDay() !== 1) start.setDate(start.getDate() + 1);
    const [a, b] = shiftTimes(m),
      codes = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"],
      excluded = restDays(m).map((day) => (days.indexOf(day) + 1) % 7),
      by = [0, 1, 2, 3, 4, 5, 6]
        .filter((x) => !excluded.includes(x))
        .map((x) => codes[x])
        .join(","),
      p = new URLSearchParams({
        action: "TEMPLATE",
        text: `Turno Keysar · ${m.branch}`,
        dates: `${compact(start, a)}/${compact(start, b)}`,
        ctz: "America/Mexico_City",
        details: `Sucursal: ${m.branch}\nHorario: ${m.shift}\nDescansos: ${restDays(m).join(" y ")}`,
        recur: `RRULE:FREQ=WEEKLY;BYDAY=${by}`,
      });
    return `https://calendar.google.com/calendar/render?${p.toString()}`;
  }
  function assignmentCalendarUrl(a: DailyAssignment) {
    const date = new Date(`${a.workDate}T12:00:00`),
      start = a.shift.includes("14:00") ? 14 : 10,
      end = a.shift.includes("14:00") ? 20 : 18,
      m = members.find((x) => x.id === a.staffId),
      p = new URLSearchParams({
        action: "TEMPLATE",
        text: `Turno Keysar · ${a.branch}`,
        dates: `${compact(date, start)}/${compact(date, end)}`,
        ctz: "America/Mexico_City",
        details: `${m?.jobRole || "Personal"} · ${a.shift}`,
        location: a.branch,
      });
    return `https://calendar.google.com/calendar/render?${p.toString()}`;
  }
  function downloadCalendar(m: Member) {
    const [a, b] = shiftTimes(m),
      excluded = restDays(m),
      lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Keysar Cosmetics//Roles//ES",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
      ];
    for (let i = 0; i < 90; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      if (excluded.includes(dayNames[d.getDay()])) continue;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${m.id}-${d.toISOString().slice(0, 10)}@keysar`,
        `DTSTART;TZID=America/Mexico_City:${compact(d, a)}`,
        `DTEND;TZID=America/Mexico_City:${compact(d, b)}`,
        `SUMMARY:Turno Keysar · ${m.branch}`,
        `DESCRIPTION:${m.jobRole} | ${m.shift}`,
        `LOCATION:${m.branch}`,
        "END:VEVENT",
      );
    }
    lines.push("END:VCALENDAR");
    const url = URL.createObjectURL(
        new Blob([lines.join("\r\n")], { type: "text/calendar" }),
      ),
      link = document.createElement("a");
    link.href = url;
    link.download = `rol-keysar-${m.name.toLowerCase().replace(/\s+/g, "-")}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  }
  async function submitRequest() {
    if (!requestStart || !requestEnd)
      return setMessage("Selecciona las fechas del movimiento.");
    const form = new FormData();
    form.set("requestType", requestType);
    form.set("startDate", requestStart);
    form.set("endDate", requestEnd);
    form.set("reason", requestReason);
    if (master && requestStaffId) form.set("staffId", String(requestStaffId));
    if (requestFile) form.set("file", requestFile);
    const r = await fetch("/api/app", { method: "POST", body: form }),
      d = await r.json();
    if (!r.ok) return setMessage(d.error);
    setRequestStart("");
    setRequestEnd("");
    setRequestReason("");
    setRequestFile(null);
    setRequestFormOpen(false);
    setMessage(
      requestType.toLowerCase().includes("vacaci")
        ? "Movimiento guardado y agregado al historial de vacaciones."
        : "Movimiento guardado correctamente en Solicitudes.",
    );
    await load();
  }
  async function saveBirthday() {
    const result = await act({
      action: "birthday_update",
      birthday: birthdayDraft,
    });
    if (result) {
      setBirthdaySkipped(false);
      setMessage("Fecha de cumpleaños guardada correctamente.");
      await load(true);
    }
  }
  function movementForm(adminMode = false) {
    const target = adminMode
      ? members.find((member) => member.id === requestStaffId)
      : currentEmployee;
    return (
      <div className="movement-form">
        <p>
          Registra el movimiento y guárdalo directamente en el historial
          correspondiente.
        </p>
        <div className="movement-form-grid">
          {adminMode && (
            <label>
              Empleado
              <select
                value={requestStaffId}
                onChange={(event) =>
                  setRequestStaffId(Number(event.target.value))
                }
              >
                {allEmployees.map((member) => (
                  <option value={member.id} key={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Tipo
            <select
              value={requestType}
              onChange={(event) => setRequestType(event.target.value)}
            >
              {permissionTypeList
                .filter((permission) => permission.active)
                .map((permission) => (
                  <option key={permission.id}>{permission.name}</option>
                ))}
            </select>
          </label>
          {requestType.toLowerCase().includes("vacaci") && (
            <label>
              Modelo de vacaciones
              <select value={target?.vacationModelId || 0} disabled>
                <option value={0}>Sin modelo asignado</option>
                {vacationModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Desde
            <input
              type="date"
              value={requestStart}
              onChange={(event) => setRequestStart(event.target.value)}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={requestEnd}
              min={requestStart}
              onChange={(event) => setRequestEnd(event.target.value)}
            />
          </label>
          <label className="reason">
            Motivo
            <textarea
              value={requestReason}
              onChange={(event) => setRequestReason(event.target.value)}
              placeholder="Describe brevemente el movimiento"
            />
          </label>
          <label className="file-field">
            Comprobante
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) =>
                setRequestFile(event.target.files?.[0] || null)
              }
            />
            <small>PDF o imagen, máximo 8 MB</small>
          </label>
        </div>
        <div className="movement-form-actions">
          <button onClick={() => setRequestFormOpen(false)}>Cancelar</button>
          <button className="save" onClick={submitRequest}>
            GUARDAR MOVIMIENTO
          </button>
        </div>
      </div>
    );
  }
  async function requestStatus(id: number, status: string) {
    await act({ action: "request_update", id, status });
    await load();
  }
  async function deleteRequest(id: number) {
    if (!window.confirm("¿Borrar esta solicitud?")) return;
    await act({ action: "request_delete", id });
    await load();
  }
  async function editRequest(r: StaffRequest) {
    const reason = window.prompt("Editar motivo de la solicitud", r.reason);
    if (reason === null) return;
    await act({ action: "request_update", id: r.id, reason });
    await load();
  }
  async function createPermissionType() {
    if (!newPermissionName.trim()) return;
    await act({
      action: "permission_type_create",
      name: newPermissionName,
      requiresDocument: newPermissionDocument ? 1 : 0,
    });
    setNewPermissionName("");
    setNewPermissionDocument(false);
    await load();
  }
  async function togglePermissionType(p: PermissionType) {
    await act({
      action: "permission_type_update",
      id: p.id,
      name: p.name,
      requiresDocument: p.requiresDocument ? 1 : 0,
      active: p.active ? 0 : 1,
    });
    await load();
  }
  async function deletePermissionType(id: number) {
    if (!window.confirm("¿Borrar este tipo de permiso?")) return;
    await act({ action: "permission_type_delete", id });
    await load();
  }
  function historyRequests() {
    const now = new Date(),
      start = new Date(now);
    if (historyPeriod === "week") start.setDate(now.getDate() - 6);
    else if (historyPeriod === "fortnight") start.setDate(now.getDate() - 14);
    else start.setDate(1);
    return requestList.filter((r) => new Date(r.createdAt) >= start);
  }
  function vacationDays(request: StaffRequest) {
    const start = new Date(`${request.startDate}T12:00:00`),
      end = new Date(`${request.endDate}T12:00:00`);
    return Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 86400000) + 1,
    );
  }
  async function saveBranch() {
    if (!branchName.trim()) return;
    const result = await act({
      action: editingBranch ? "branch_update" : "branch_create",
      id: editingBranch,
      name: branchName,
      managerId: branchManager,
      openingTime: branchOpening,
      closingTime: branchClosing,
    });
    if (!result) return;
    setBranchName("");
    setBranchManager(0);
    setBranchOpening("10:00");
    setBranchClosing("20:00");
    setEditingBranch(0);
    await load(true);
  }
  function startEditBranch(b: Branch) {
    setEditingBranch(b.id);
    setBranchName(b.name);
    setBranchManager(b.managerId || 0);
    setBranchOpening(b.openingTime || "10:00");
    setBranchClosing(b.closingTime || "20:00");
  }
  async function deleteBranch(b: Branch) {
    if (!window.confirm(`¿Borrar la sucursal ${b.name}?`)) return;
    await act({ action: "branch_delete", id: b.id });
    await load();
  }
  function daily(staffId: number, date = scheduleDate) {
    return dailyAssignments.find(
      (a) => a.staffId === staffId && a.workDate === date,
    );
  }
  function draftDaily(staffId: number) {
    const saved = daily(staffId);
    return (
      scheduleDraft[staffId] || {
        branch: saved?.branch || branchOptions[0] || "Sin asignar",
        shift: saved?.shift || "Sin asignar",
      }
    );
  }
  function setDailyDraft(
    staffId: number,
    key: "branch" | "shift",
    value: string,
  ) {
    setScheduleDraft((current) => ({
      ...current,
      [staffId]: { ...draftDaily(staffId), ...current[staffId], [key]: value },
    }));
  }
  function changeScheduleDate(value: string) {
    if (
      Object.keys(scheduleDraft).length &&
      !window.confirm(
        "Hay cambios de horario sin guardar. ¿Deseas descartarlos y cambiar de fecha?",
      )
    )
      return;
    const focus = new Date(`${value}T12:00:00`),
      monday = new Date(focus);
    monday.setDate(focus.getDate() - ((focus.getDay() + 6) % 7));
    setScheduleDraft({});
    setScheduleDate(value);
    setWeekStart(monday);
    setMonthDate(new Date(focus.getFullYear(), focus.getMonth(), 1));
  }
  function repeatedScheduleDate() {
    const source = new Date(`${scheduleDate}T12:00:00`);
    source.setDate(source.getDate() - (repeatScheduleSource === "week" ? 7 : 1));
    return dateKey(source);
  }
  function loadRepeatedSchedule() {
    if (
      Object.keys(scheduleDraft).length &&
      !window.confirm(
        "Se reemplazarán los cambios de horario que aún no has guardado. ¿Deseas continuar?",
      )
    )
      return;
    const sourceDate = repeatedScheduleDate(),
      activeIds = new Set(shown.map((member) => member.id)),
      sourceAssignments = dailyAssignments.filter(
        (assignment) =>
          assignment.workDate === sourceDate && activeIds.has(assignment.staffId),
      );
    if (!sourceAssignments.length) {
      setMessage(`No hay horarios guardados para repetir del ${sourceDate}.`);
      return;
    }
    setScheduleDraft(
      Object.fromEntries(
        sourceAssignments.map((assignment) => [
          assignment.staffId,
          { branch: assignment.branch, shift: assignment.shift },
        ]),
      ),
    );
    setRepeatScheduleOpen(false);
    setMessage(
      `Horario del ${sourceDate} cargado para ${sourceAssignments.length} ${sourceAssignments.length === 1 ? "empleado" : "empleados"}. Puedes moverlos de sucursal o turno antes de guardar.`,
    );
  }
  async function saveSchedule() {
    const pending = Object.entries(scheduleDraft);
    if (!pending.length)
      return setMessage("No hay cambios pendientes en el calendario.");
    setSavingSchedule(true);
    for (const [staffId, draft] of pending) {
      const result = await act({
        action: "assignment_set",
        staffId: Number(staffId),
        workDate: scheduleDate,
        branch: draft.branch,
        shift: draft.shift,
      });
      if (!result) {
        setSavingSchedule(false);
        return;
      }
    }
    setScheduleDraft({});
    await load();
    setSavingSchedule(false);
    setMessage(
      `Horario guardado correctamente para ${pending.length} ${pending.length === 1 ? "empleado" : "empleados"}.`,
    );
  }
  function shiftRank(shift: string) {
    return shift.includes("10:00") ? 0 : shift.includes("14:00") ? 1 : 2;
  }
  function sortedAssignments(items: DailyAssignment[]) {
    return [...items].sort((a, b) =>
      (members.find((m) => m.id === a.staffId)?.name || "").localeCompare(
        members.find((m) => m.id === b.staffId)?.name || "",
        "es",
      ),
    );
  }
  function authorizedAbsence(staffId: number, workDate: string) {
    return calendarAbsenceList.find(
      (request) =>
        request.staffId === staffId &&
        request.status === "Autorizado" &&
        request.startDate <= workDate &&
        request.endDate >= workDate,
    );
  }
  function attendanceBlockingMovement(staffId: number, workDate: string) {
    const member = members.find((person) => person.id === staffId),
      role = member?.jobRole.toLocaleLowerCase("es-MX") || "";
    if (!role.includes("vended") && !role.includes("facialista")) return false;
    return Boolean(authorizedAbsence(staffId, workDate));
  }
  async function bulkDelete(
    entity: "staff" | "requests" | "branches",
    ids: number[],
    clear: (ids: number[]) => void,
  ) {
    if (
      !ids.length ||
      !window.confirm(
        `¿Borrar definitivamente ${ids.length} registros seleccionados?`,
      )
    )
      return;
    const result = await act({ action: "bulk_delete", entity, ids });
    if (result) {
      clear([]);
      setMessage(`${ids.length} registros eliminados.`);
      await load(true);
    }
  }
  const master = !!session?.isAdmin,
    facialistViewer = (session?.role || "")
      .toLowerCase()
      .includes("facialista"),
    canManageDailySchedule =
      master || (session?.role || "").toLocaleLowerCase("es-MX") === "gerente",
    access = parsePermissions(session?.permissions, master),
    canView = (module: PermissionKey) => master || access[module].view,
    canEdit = (module: PermissionKey) => master || access[module].edit,
    admin =
      master || permissionModules.some((module) => access[module.key].view),
    portal = admin,
    readOnlyModule =
      portal && !master && tab !== "access" && !canEdit(tab as PermissionKey),
    allEmployees = members.filter(
      (m) => !(m.isAdmin && m.username === "master"),
    ),
    shown = allEmployees.filter((m) => m.isActive),
    selected = allEmployees.find((m) => m.id === selectedId) || shown[0],
    profileDirty = !!(
      editing &&
      editingOriginal &&
      selected &&
      JSON.stringify(selected) !== JSON.stringify(editingOriginal)
    ),
    currentEmployee = allEmployees.find((m) => m.id === session?.id),
    currentVacationBalance = currentEmployee
      ? vacationBalance(currentEmployee, vacationModels, requestList)
      : null,
    vacationRequests = requestList.filter((request) =>
      request.requestType.toLowerCase().includes("vacaci"),
    ),
    vacationBalanceRows = allEmployees.map((member) => ({
      member,
      balance: vacationBalance(member, vacationModels, requestList),
    })),
    exhaustedVacationBalances = vacationBalanceRows.filter(
      ({ balance }) => balance.model && balance.remaining === 0,
    ),
    branchOptions = branchList.length
      ? branchList.map((b) => b.name)
      : branches,
    jobRoleOptions = jobRoleList
      .filter((role) => role.active && (master || role.name !== "Master"))
      .map((role) => role.name),
    todayKey = new Date().toISOString().slice(0, 10),
    birthdayPromptVisible =
      session?.status === "active" && !session.birthday && !birthdaySkipped;
  const scopedRequests = requestList.filter((request) =>
    requestScope === "history"
      ? true
      : requestScope === "date"
        ? request.startDate <= requestPeriodDate &&
          request.endDate >= requestPeriodDate
        : request.status === "Pendiente" ||
          (request.status === "Autorizado" &&
            request.startDate <= todayKey &&
            request.endDate >= todayKey),
  );
  const visibleRequests = scopedRequests.filter(
    (request) =>
      authorizationFilter === "Todas" || request.status === authorizationFilter,
  );
  const monthDays = useMemo(() => {
    const y = monthDate.getFullYear(),
      m = monthDate.getMonth(),
      count = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => new Date(y, m, i + 1));
  }, [monthDate]);
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart],
  );
  const fortnightDays = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart],
  );
  const copy = uiText[locale],
    brandInitial = (branding.brandName.trim()[0] || "K").toUpperCase(),
    brandNameLength = Array.from(branding.brandName.trim()).length,
    brandSubtitleLength = Array.from(branding.brandSubtitle.trim()).length,
    brandSizing = {
      "--brand-name-size": `${Math.max(11, Math.min(17, 20.5 - brandNameLength * 0.28))}px`,
      "--brand-name-spacing": `${Math.max(0.06, 0.25 - brandNameLength * 0.006)}em`,
      "--brand-subtitle-size": `${Math.max(6, Math.min(8, 9.2 - brandSubtitleLength * 0.045))}px`,
      "--brand-subtitle-spacing": `${Math.max(0.04, 0.22 - brandSubtitleLength * 0.003)}em`,
      "--login-brand-name-size": `${Math.max(12, Math.min(20, 24 - brandNameLength * 0.3))}px`,
    } as CSSProperties;
  if (loading) return <div className="loading">Preparando tu perfil…</div>;
  if (session?.status === "inactive")
    return (
      <main className="access-screen">
        <div className="access-card login-card">
          <span className="mark">K</span>
          <p className="eyebrow">CUENTA INACTIVA</p>
          <h1>Acceso suspendido</h1>
          <p>
            Tu perfil permanece guardado, pero el administrador lo marcó como
            inactivo.
          </p>
          <small>
            Comunícate con el administrador para solicitar la reactivación.
          </small>
          <button className="text-button" onClick={logoutProfile}>
            Salir
          </button>
        </div>
      </main>
    );
  if (session?.status === "unlinked")
    return (
      <main className="master-login luxury-login">
        <section>
          <div className="login-brand">
            <span>
              {branding.logoUrl ? (
                <img
                  className="brand-logo-image"
                  src={branding.logoUrl}
                  alt={`Logotipo ${branding.brandName}`}
                />
              ) : (
                brandInitial
              )}
            </span>
            <div className="brand-copy" style={brandSizing}>
              <b>{branding.brandName}</b>
              <small>{branding.brandSubtitle}</small>
            </div>
          </div>
          <p className="eyebrow">PORTAL PRIVADO</p>
          <h1>
            Tu jornada.
            <br />
            <em>En un solo lugar.</em>
          </h1>
          <p>
            Consulta tus horarios, descansos y solicitudes con el usuario y la
            contraseña generados por {branding.brandName}.
          </p>
          <div className="login-fields">
            <label>
              Usuario asignado
              <input
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value.toLowerCase())}
                placeholder="Ej. erang"
                autoComplete="username"
                autoFocus
                aria-label="Usuario asignado"
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                value={claim}
                onChange={(e) => setClaim(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void claimProfile();
                }}
                placeholder="KEY-XXXX-0000"
                autoComplete="current-password"
                aria-label="Contraseña"
              />
            </label>
          </div>
          <button className="master-login-button" onClick={claimProfile}>
            INGRESAR CON MI USUARIO <span>→</span>
          </button>
          {message && <p className="login-error">{message}</p>}
          <div className="login-secondary">
            <span>
              <b>ACCESO EXCLUSIVO</b> · No se requiere correo electrónico
            </span>
            <span>
              Usa únicamente las credenciales generadas por administración
            </span>
          </div>
        </section>
        <aside>
          <div className="luxury-seal">{brandInitial}</div>
          <p className="luxury-kicker">{branding.brandName}</p>
          <h2>
            Excelencia que
            <br />
            <em>se organiza.</em>
          </h2>
          <p>
            Una experiencia interna diseñada con la misma precisión, elegancia y
            cuidado que ofrecemos a cada cliente.
          </p>
          <div className="login-benefits">
            <span>
              <b>01</b> Horarios actualizados
            </span>
            <span>
              <b>02</b> Solicitudes y permisos
            </span>
            <span>
              <b>03</b> Información personal
            </span>
          </div>
        </aside>
      </main>
    );
  return (
    <main
      className={`${portal ? "admin-shell" : ""} ${readOnlyModule ? "read-only-module" : ""}`}
    >
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark-wrap">
            <span className="mark">
              {branding.logoUrl ? (
                <img
                  className="brand-logo-image"
                  src={branding.logoUrl}
                  alt={`Logotipo ${branding.brandName}`}
                />
              ) : (
                brandInitial
              )}
            </span>
            {master && (
              <button
                type="button"
                className="brand-edit-button"
                onClick={() => setBrandEditorSignal((current) => current + 1)}
                aria-label="Editar logotipo"
                title="Editar logotipo"
              >
                ✎
              </button>
            )}
          </div>
          <div className="brand-copy" style={brandSizing}>
            <strong>{branding.brandName}</strong>
            <small>{branding.brandSubtitle}</small>
          </div>
        </div>
        <span className="hello-user">Hola, {session?.name?.split(" ")[0]}</span>
        <div className="user-chip">
          <div className="help-widget">
            {helpOpen && (
              <aside className="help-card" id="help-card" role="dialog" aria-label="Ayuda">
                <button
                  type="button"
                  className="help-close"
                  onClick={() => setHelpOpen(false)}
                  aria-label="Cerrar ayuda"
                >
                  ×
                </button>
                <strong>¿Necesitas ayuda?</strong>
                <p>
                  Si tienes dudas sobre tu acceso, horario o solicitudes,
                  comunícate con tu administrador.
                </p>
              </aside>
            )}
            <button
              type="button"
              className="help-trigger"
              onClick={() => setHelpOpen((current) => !current)}
              aria-expanded={helpOpen}
              aria-controls="help-card"
            >
              <span aria-hidden="true">💬</span>
              ¿Necesitas ayuda?
            </button>
          </div>
          {canView("birthdays") && (
            <button
              className="policies-shortcut"
              onClick={() => setTab("birthdays")}
            >
              ✦ Cumpleaños
            </button>
          )}
          {canView("policies") && (
            <button
              className="policies-shortcut"
              onClick={() => setTab("policies")}
            >
              ▤ Políticas
            </button>
          )}
          <button
            className="refresh-control"
            onClick={() => load(true)}
            title="Actualizar ahora"
          >
            ↻{" "}
            <span>
              Actualizado{" "}
              {lastUpdated.toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </button>
          <InterfaceControls
            master={master}
            branding={branding}
            locale={locale}
            onLocale={setLocale}
            onBrandSaved={setBranding}
            brandEditorSignal={brandEditorSignal}
            onBrandEditorHandled={() => setBrandEditorSignal(0)}
          />
          <div>
            <b>{session?.name}</b>
            <span>
              {master ? copy.master : portal ? copy.admin : session?.role}
            </span>
          </div>
          {master && signOut ? (
            <a href={signOut}>{copy.logout}</a>
          ) : (
            <button className="logout-button" onClick={logoutProfile}>
              {copy.logout}
            </button>
          )}
        </div>
      </header>
      {message && (
        <div className="global-message">
          {message}
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}
      {portal && (
        <nav className="admin-nav">
          <div>
            <span className="sidebar-title">{copy.menu}</span>
            {canEdit("personal") && (
              <button
                className="new-employee"
                onClick={() => {
                  setTab("personal");
                  setFirstName("");
                  setPaternalSurname("");
                  setMaternalSurname("");
                  setJob(jobRoleOptions[0] || "Sin puesto");
                  setNewRestDay("Domingo");
                  setNewRestDay2("Sin asignar");
                  setNewRestType("Fijo");
                  setNewRestStart("");
                  setNewRestEnd("");
                  setSelectedId(0);
                }}
              >
                <i>＋</i> {copy.newEmployee}
              </button>
            )}
            {canView("employees") && (
              <button
                className={tab === "employees" ? "active" : ""}
                onClick={() => setTab("employees")}
              >
                <i>▦</i> {copy.employees}
              </button>
            )}
            {canView("personal") && (
              <button
                className={tab === "personal" ? "active" : ""}
                onClick={() => setTab("personal")}
              >
                <i>♙</i> {copy.personal}
              </button>
            )}
            {canView("calendar") && (
              <button
                className={tab === "calendar" ? "active" : ""}
                onClick={() => setTab("calendar")}
              >
                <i>□</i> {copy.calendar}
              </button>
            )}
            {canView("requests") && (
              <button
                className={tab === "requests" ? "active" : ""}
                onClick={() => setTab("requests")}
              >
                <i>✓</i> {copy.requests}{" "}
                <b>
                  {requestList.filter((r) => r.status === "Pendiente").length}
                </b>
              </button>
            )}
            {canView("vacations") && (
              <button
                className={tab === "vacations" ? "active" : ""}
                onClick={() => setTab("vacations")}
              >
                <i>☼</i> {copy.vacations}
              </button>
            )}
            {canView("branches") && (
              <button
                className={tab === "branches" ? "active" : ""}
                onClick={() => setTab("branches")}
              >
                <i>◇</i> {copy.branches}
              </button>
            )}
            {canView("positions") && (
              <button
                className={tab === "positions" ? "active" : ""}
                onClick={() => setTab("positions")}
              >
                <i>♜</i> Puestos
              </button>
            )}
            {canView("facialists") && (
              <button
                className={tab === "facialists" ? "active" : ""}
                onClick={() => setTab("facialists")}
              >
                <i>✧</i> Horarios facialistas
              </button>
            )}
            {canView("birthdays") && (
              <button
                className={tab === "birthdays" ? "active" : ""}
                onClick={() => setTab("birthdays")}
              >
                <i>✦</i> Cumpleaños
              </button>
            )}
            {canView("policies") && (
              <button
                className={tab === "policies" ? "active" : ""}
                onClick={() => setTab("policies")}
              >
                <i>▤</i> Políticas y reglamentos
              </button>
            )}
            {master && (
              <button
                className={tab === "access" ? "active" : ""}
                onClick={() => setTab("access")}
              >
                <i>◆</i> {copy.access}
              </button>
            )}
          </div>
        </nav>
      )}
      <section className="hero account-hero">
        <div>
          <p className="eyebrow">
            {portal
              ? tab === "employees"
                ? "DIRECTORIO DE PERSONAL"
                : tab === "personal"
                  ? "ADMINISTRACIÓN DE PERSONAL"
                  : tab === "vacations"
                    ? "HISTORIAL GENERAL DE VACACIONES"
                    : tab === "access"
                      ? "SEGURIDAD Y PERMISOS"
                      : "PLANEACIÓN Y CONTROL"
              : "MI PERFIL"}
          </p>
          <h1>
            {portal ? (
              tab === "employees" ? (
                <>
                  Todos los
                  <br />
                  <em>empleados.</em>
                </>
              ) : tab === "personal" ? (
                <>
                  Altas y<br />
                  <em>edición.</em>
                </>
              ) : tab === "vacations" ? (
                <>
                  Vacaciones.
                  <br />
                  <em>Todo el equipo.</em>
                </>
              ) : tab === "access" ? (
                <>
                  Control.
                  <br />
                  <em>Acceso total.</em>
                </>
              ) : (
                <>
                  Operación.
                  <br />
                  <em>Todo en orden.</em>
                </>
              )
            ) : (
              <>
                Hola, {session?.name?.split(" ")[0]}.<br />
                <em>Este es tu rol.</em>
              </>
            )}
          </h1>
          <p className="intro">
            {portal
              ? tab === "employees"
                ? "Consulta los registros del personal según tu nivel de acceso."
                : tab === "personal"
                  ? "Consulta o administra perfiles según los permisos asignados."
                  : tab === "vacations"
                    ? "Consulta las vacaciones solicitadas, autorizadas o rechazadas."
                    : tab === "access"
                      ? "El usuario Maestro conserva todos los permisos y controla el acceso de cada cuenta."
                      : "Consulta y administra únicamente los módulos autorizados."
              : "Consulta tu sucursal, horario y día de descanso desde cualquier dispositivo."}
          </p>
        </div>
        <div className="stats">
          <div>
            <span>PERSONAL</span>
            <b>{allEmployees.length}</b>
          </div>
          <div>
            <span>ACTIVOS</span>
            <b>{shown.length}</b>
          </div>
          <div>
            <span>SUCURSALES</span>
            <b>{branchOptions.length}</b>
          </div>
        </div>
      </section>
      {admin && canView("personal") && tab === "personal" && (
        <>
          <section className="account-grid">
            <div className="panel create-account">
              <div className="section-head">
                <div>
                  <span className="step">01</span>
                  <h2>Nueva cuenta</h2>
                </div>
              </div>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Nombre del empleado"
              />
              <input
                value={paternalSurname}
                onChange={(e) => setPaternalSurname(e.target.value)}
                placeholder="Apellido paterno"
              />
              <input
                value={maternalSurname}
                onChange={(e) => setMaternalSurname(e.target.value)}
                placeholder="Apellido materno"
              />
              <input
                type="email"
                value={employeeEmail}
                onChange={(e) => setEmployeeEmail(e.target.value)}
                placeholder="Correo de contacto (opcional, no se usa para acceder)"
              />
              <select value={job} onChange={(e) => setJob(e.target.value)}>
                {jobRoleOptions.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
              <label className="rest-registration">
                Modelo de vacaciones obligatorio
                <select
                  value={newVacationModelId}
                  onChange={(e) =>
                    setNewVacationModelId(Number(e.target.value))
                  }
                >
                  <option value={0}>Seleccionar modelo</option>
                  {vacationModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} · {model.totalDays} días
                    </option>
                  ))}
                </select>
              </label>
              <div className="rest-days-group">
                <p>Selecciona hasta 2 días de descanso</p>
                <label className="rest-registration">
                  Descanso 1
                  <select
                    value={newRestDay}
                    onChange={(e) => setNewRestDay(e.target.value)}
                  >
                    {days.map((day) => (
                      <option key={day}>{day}</option>
                    ))}
                  </select>
                </label>
                <label className="rest-registration">
                  Descanso 2 <small>Opcional</small>
                  <select
                    value={newRestDay2}
                    onChange={(e) => setNewRestDay2(e.target.value)}
                  >
                    <option>Sin asignar</option>
                    {days
                      .filter((day) => day !== newRestDay)
                      .map((day) => (
                        <option key={day}>{day}</option>
                      ))}
                  </select>
                </label>
              </div>
              <label className="rest-registration">
                Tipo de descanso
                <select
                  value={newRestType}
                  onChange={(e) => setNewRestType(e.target.value)}
                >
                  <option>Fijo</option>
                  <option>Temporal</option>
                </select>
              </label>
              {newRestType === "Temporal" && (
                <>
                  <label className="rest-registration">
                    Válido desde
                    <input
                      type="date"
                      value={newRestStart}
                      onChange={(e) => setNewRestStart(e.target.value)}
                    />
                  </label>
                  <label className="rest-registration">
                    Válido hasta
                    <input
                      type="date"
                      value={newRestEnd}
                      min={newRestStart}
                      onChange={(e) => setNewRestEnd(e.target.value)}
                    />
                  </label>
                </>
              )}
              <button className="primary" onClick={create}>
                CREAR USUARIO Y CONTRASEÑA
              </button>
              {password && (
                <div className="password-box credential-box">
                  <span>USUARIO ÚNICO</span>
                  <strong>{generatedUsername}</strong>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(generatedUsername)
                    }
                  >
                    Copiar usuario
                  </button>
                  <span>CONTRASEÑA TEMPORAL</span>
                  <strong>{password}</strong>
                  <button
                    onClick={() => navigator.clipboard.writeText(password)}
                  >
                    Copiar contraseña
                  </button>
                  <small className="credential-note">
                    Entrega estas credenciales directamente al empleado. No se
                    envían por correo.
                  </small>
                </div>
              )}
              {message && <p className="notice">✓ {message}</p>}
            </div>
            <div className="panel staff-selector">
              <p className="eyebrow">PERSONAL ACTIVO</p>
              <h2>Seleccionar perfil</h2>
              <select
                value={selected?.id || 0}
                onChange={(e) => {
                  setSelectedId(Number(e.target.value));
                  setEditing(false);
                }}
              >
                {shown.map((m) => (
                  <option value={m.id} key={m.id}>
                    {m.name} · {m.username ? `@${m.username}` : m.branch}
                  </option>
                ))}
              </select>
              {selected && (
                <div className="selected-actions">
                  {editing ? (
                    <button onClick={cancelEdit}>Cancelar edición</button>
                  ) : (
                    <button onClick={() => beginEdit(selected)}>Editar</button>
                  )}
                  <button className="danger" onClick={() => remove(selected)}>
                    Borrar
                  </button>
                </div>
              )}
              <p>{shown.length} perfiles activos</p>
            </div>
          </section>
          {selected && (
            <section className="roles-area">
              <div className="schedule-head">
                <div>
                  <span className="step">02</span>
                  <h2>Detalle del perfil</h2>
                </div>
                <i
                  className={
                    selected.isActive ? "status-active" : "status-pending"
                  }
                >
                  {selected.isActive ? "Empleado activo" : "Empleado inactivo"}
                </i>
              </div>
              <article className="profile-editor">
                <div className="profile-top">
                  <span className="avatar">
                    {selected.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div>
                    <input
                      disabled={!editing}
                      value={selected.name}
                      onChange={(e) =>
                        localUpdate(selected.id, "name", e.target.value)
                      }
                    />
                    <small className="profile-username">
                      {selected.username
                        ? `Usuario: ${selected.username}`
                        : "Usuario pendiente de generar"}
                    </small>
                    <select
                      disabled={!editing}
                      value={selected.jobRole}
                      onChange={(e) =>
                        localUpdate(selected.id, "jobRole", e.target.value)
                      }
                    >
                      {[...new Set([selected.jobRole, ...jobRoleOptions])].map(
                        (role) => (
                          <option key={role}>{role}</option>
                        ),
                      )}
                    </select>
                  </div>
                </div>
                <div className="assignment">
                  <label>
                    Modelo de vacaciones
                    <select
                      disabled={!editing}
                      value={selected.vacationModelId || 0}
                      onChange={(e) =>
                        localUpdate(
                          selected.id,
                          "vacationModelId",
                          Number(e.target.value),
                        )
                      }
                    >
                      <option value={0}>Sin modelo</option>
                      {vacationModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} · {model.totalDays} días
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Sucursal
                    <select
                      disabled={!editing}
                      value={selected.branch}
                      onChange={(e) =>
                        localUpdate(selected.id, "branch", e.target.value)
                      }
                    >
                      {branchOptions.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Turno
                    <select
                      disabled={!editing}
                      value={selected.shift}
                      onChange={(e) =>
                        localUpdate(selected.id, "shift", e.target.value)
                      }
                    >
                      {shifts.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Descanso 1
                    <select
                      disabled={!editing}
                      value={selected.restDay}
                      onChange={(e) =>
                        localUpdate(selected.id, "restDay", e.target.value)
                      }
                    >
                      {days.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Descanso 2
                    <select
                      disabled={!editing}
                      value={selected.restDay2 || "Sin asignar"}
                      onChange={(e) =>
                        localUpdate(selected.id, "restDay2", e.target.value)
                      }
                    >
                      <option>Sin asignar</option>
                      {days
                        .filter((day) => day !== selected.restDay)
                        .map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Tipo de descanso
                    <select
                      disabled={!editing}
                      value={selected.restType || "Fijo"}
                      onChange={(e) =>
                        localUpdate(selected.id, "restType", e.target.value)
                      }
                    >
                      <option>Fijo</option>
                      <option>Temporal</option>
                    </select>
                  </label>
                  {selected.restType === "Temporal" && (
                    <>
                      <label>
                        Válido desde
                        <input
                          disabled={!editing}
                          type="date"
                          value={selected.restStartDate || ""}
                          onChange={(e) =>
                            localUpdate(
                              selected.id,
                              "restStartDate",
                              e.target.value,
                            )
                          }
                        />
                      </label>
                      <label>
                        Válido hasta
                        <input
                          disabled={!editing}
                          type="date"
                          value={selected.restEndDate || ""}
                          onChange={(e) =>
                            localUpdate(
                              selected.id,
                              "restEndDate",
                              e.target.value,
                            )
                          }
                        />
                      </label>
                    </>
                  )}
                </div>
                <div className="editor-actions">
                  <a
                    href={calendarUrl(selected)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google Calendar
                  </a>
                  <button onClick={() => downloadCalendar(selected)}>
                    Descargar calendario
                  </button>
                  <button onClick={() => regenerate(selected.id)}>
                    Nueva contraseña
                  </button>
                  {editing && profileDirty && (
                    <>
                      <button className="cancel" onClick={cancelEdit}>
                        CANCELAR
                      </button>
                      <button
                        className="save"
                        onClick={() => saveMember(selected)}
                      >
                        CONFIRMAR CAMBIO
                      </button>
                    </>
                  )}
                </div>
              </article>
              {master && (
                <EmployeeBiography
                  member={selected}
                  models={vacationModels}
                  requests={requestList}
                  assignments={dailyAssignments}
                />
              )}
            </section>
          )}
        </>
      )}
      {admin && canView("requests") && tab === "requests" && (
        <section className="management-area">
          <div className="management-head">
            <div>
              <p className="eyebrow">SOLICITUDES DEL PERSONAL</p>
              <h2>Permisos y vacaciones</h2>
            </div>
            <span>
              {scopedRequests.filter((r) => r.status === "Pendiente").length}{" "}
              pendientes
            </span>
            <button
              className="movement-toggle"
              onClick={() => setRequestFormOpen((open) => !open)}
            >
              {requestFormOpen ? "CERRAR" : "＋ AGREGAR MOVIMIENTO"}
            </button>
          </div>
          {requestFormOpen && movementForm(master)}
          <div className="permission-screen-tabs">
            <button
              className={permissionView === "authorizations" ? "active" : ""}
              onClick={() => setPermissionView("authorizations")}
            >
              Solicitudes
            </button>
            <button
              className={permissionView === "configuration" ? "active" : ""}
              onClick={() => setPermissionView("configuration")}
            >
              Configurar tipos
            </button>
          </div>
          {permissionView === "configuration" && (
            <div className="permission-config">
              <div className="permission-create">
                <input
                  value={newPermissionName}
                  onChange={(e) => setNewPermissionName(e.target.value)}
                  placeholder="Nuevo tipo de permiso"
                />
                <label>
                  <input
                    type="checkbox"
                    checked={newPermissionDocument}
                    onChange={(e) => setNewPermissionDocument(e.target.checked)}
                  />{" "}
                  Requiere comprobante
                </label>
                <button onClick={createPermissionType}>Crear permiso</button>
              </div>
              <div className="permission-type-list">
                {permissionTypeList.map((p) => (
                  <article key={p.id}>
                    <div>
                      <b>{p.name}</b>
                      <span>
                        {p.requiresDocument
                          ? "Comprobante obligatorio"
                          : "Sin comprobante obligatorio"}
                      </span>
                    </div>
                    <i>{p.active ? "Activo" : "Inactivo"}</i>
                    <button onClick={() => togglePermissionType(p)}>
                      {p.active ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      className="danger"
                      onClick={() => deletePermissionType(p.id)}
                    >
                      Borrar
                    </button>
                  </article>
                ))}
              </div>
            </div>
          )}
          {permissionView === "authorizations" && (
            <>
              <div className="request-scope">
                <button
                  className={requestScope === "current" ? "active" : ""}
                  onClick={() => setRequestScope("current")}
                >
                  Vigentes
                </button>
                <button
                  className={requestScope === "history" ? "active" : ""}
                  onClick={() => setRequestScope("history")}
                >
                  Historial completo
                </button>
                <button
                  className={requestScope === "date" ? "active" : ""}
                  onClick={() => setRequestScope("date")}
                >
                  Otra fecha
                </button>
                {requestScope === "date" && (
                  <label>
                    Consultar fecha
                    <input
                      type="date"
                      value={requestPeriodDate}
                      onChange={(e) => setRequestPeriodDate(e.target.value)}
                    />
                  </label>
                )}
                <span>{scopedRequests.length} registros encontrados</span>
              </div>
              <div className="authorization-summary">
                <button
                  className={
                    authorizationFilter === "Pendiente" ? "active" : ""
                  }
                  onClick={() => setAuthorizationFilter("Pendiente")}
                >
                  <b>
                    {
                      scopedRequests.filter((r) => r.status === "Pendiente")
                        .length
                    }
                  </b>
                  <span>Pendientes</span>
                </button>
                <button
                  className={
                    authorizationFilter === "Autorizado" ? "active" : ""
                  }
                  onClick={() => setAuthorizationFilter("Autorizado")}
                >
                  <b>
                    {
                      scopedRequests.filter((r) => r.status === "Autorizado")
                        .length
                    }
                  </b>
                  <span>Autorizadas</span>
                </button>
                <button
                  className={
                    authorizationFilter === "No autorizado" ? "active" : ""
                  }
                  onClick={() => setAuthorizationFilter("No autorizado")}
                >
                  <b>
                    {
                      scopedRequests.filter((r) => r.status === "No autorizado")
                        .length
                    }
                  </b>
                  <span>No autorizadas</span>
                </button>
                <button
                  className={authorizationFilter === "Todas" ? "active" : ""}
                  onClick={() => setAuthorizationFilter("Todas")}
                >
                  <b>{scopedRequests.length}</b>
                  <span>Todas</span>
                </button>
              </div>
              <SelectionToolbar
                ids={visibleRequests.map((request) => request.id)}
                selected={selectedRequestIds}
                onChange={setSelectedRequestIds}
                onDelete={() =>
                  bulkDelete(
                    "requests",
                    selectedRequestIds,
                    setSelectedRequestIds,
                  )
                }
                label="solicitudes"
              />
              <div className="request-list">
                {visibleRequests.map((r) => {
                  const employee = allEmployees.find((m) => m.id === r.staffId);
                  return (
                    <article className="request-row" key={r.id}>
                      <input
                        className="row-selector"
                        type="checkbox"
                        checked={selectedRequestIds.includes(r.id)}
                        onChange={() =>
                          setSelectedRequestIds((current) =>
                            current.includes(r.id)
                              ? current.filter((id) => id !== r.id)
                              : [...current, r.id],
                          )
                        }
                      />
                      <div>
                        <b>{employee?.name || "Empleado"}</b>
                        <span>{r.requestType}</span>
                      </div>
                      <div>
                        <small>PERIODO</small>
                        <strong>
                          {r.startDate} → {r.endDate}
                        </strong>
                        <p>{r.reason || "Sin comentarios"}</p>
                        {r.attachmentKey && (
                          <a
                            className="attachment-link"
                            href={
                              "/api/app?attachment=" +
                              encodeURIComponent(r.attachmentKey)
                            }
                          >
                            Descargar comprobante
                          </a>
                        )}
                      </div>
                      <i
                        className={`request-status ${r.status.toLowerCase().replace(" ", "-")}`}
                      >
                        {r.status}
                      </i>
                      <div className="request-actions">
                        <button
                          className="approve"
                          onClick={() => requestStatus(r.id, "Autorizado")}
                        >
                          Aceptar
                        </button>
                        <button
                          className="reject"
                          onClick={() => requestStatus(r.id, "No autorizado")}
                        >
                          No autorizado
                        </button>
                        <button onClick={() => editRequest(r)}>Editar</button>
                        <button
                          className="delete"
                          onClick={() => deleteRequest(r.id)}
                        >
                          Borrar
                        </button>
                      </div>
                    </article>
                  );
                })}
                {!visibleRequests.length && (
                  <div className="empty">
                    <h3>Sin solicitudes en este periodo</h3>
                    <p>
                      Cambia el estado o selecciona otra fecha para consultar el
                      historial.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}
      {admin && canView("branches") && tab === "branches" && (
        <section className="management-area">
          <div className="branch-manager">
            <div className="panel branch-form">
              <p className="eyebrow">
                {editingBranch ? "EDITAR SUCURSAL" : "NUEVA SUCURSAL"}
              </p>
              <h2>{editingBranch ? "Actualizar tienda" : "Crear tienda"}</h2>
              <input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Nombre de la sucursal"
              />
              <label>
                Encargado de sucursal
                <select
                  value={branchManager}
                  onChange={(e) => setBranchManager(Number(e.target.value))}
                >
                  <option value={0}>Sin encargado</option>
                  {shown.map((m) => (
                    <option value={m.id} key={m.id}>
                      {m.name} · {m.jobRole}
                    </option>
                  ))}
                </select>
              </label>
              <div className="branch-hours">
                <label>
                  Apertura
                  <input
                    type="time"
                    value={branchOpening}
                    onChange={(e) => setBranchOpening(e.target.value)}
                  />
                </label>
                <label>
                  Cierre
                  <input
                    type="time"
                    value={branchClosing}
                    onChange={(e) => setBranchClosing(e.target.value)}
                  />
                </label>
              </div>
              <small>
                Los turnos de vendedores deben quedar dentro de este horario.
              </small>
              <button className="primary" onClick={saveBranch}>
                {editingBranch ? "GUARDAR CAMBIOS" : "CREAR SUCURSAL"}
              </button>
              {editingBranch > 0 && (
                <button
                  className="cancel"
                  onClick={() => {
                    setEditingBranch(0);
                    setBranchName("");
                    setBranchManager(0);
                    setBranchOpening("10:00");
                    setBranchClosing("20:00");
                  }}
                >
                  Cancelar edición
                </button>
              )}
            </div>
            <div>
              <SelectionToolbar
                ids={branchList.map((branch) => branch.id)}
                selected={selectedBranchIds}
                onChange={setSelectedBranchIds}
                onDelete={() =>
                  bulkDelete(
                    "branches",
                    selectedBranchIds,
                    setSelectedBranchIds,
                  )
                }
                label="sucursales"
              />
              <div className="branch-list">
                {branchList.map((b) => {
                  const manager = shown.find((m) => m.id === b.managerId),
                    team = shown.filter((m) => m.branch === b.name);
                  return (
                    <article className="branch-admin-card" key={b.id}>
                      <input
                        className="row-selector"
                        type="checkbox"
                        checked={selectedBranchIds.includes(b.id)}
                        onChange={() =>
                          setSelectedBranchIds((current) =>
                            current.includes(b.id)
                              ? current.filter((id) => id !== b.id)
                              : [...current, b.id],
                          )
                        }
                      />
                      <div>
                        <span className="store-icon">K</span>
                        <div>
                          <h3>{b.name}</h3>
                          <p>{team.length} colaboradores</p>
                        </div>
                      </div>
                      <dl>
                        <dt>ENCARGADO</dt>
                        <dd>{manager?.name || "Sin asignar"}</dd>
                        <dt>HORARIO</dt>
                        <dd>
                          {b.openingTime || "10:00"}–{b.closingTime || "20:00"}
                        </dd>
                      </dl>
                      <div>
                        <button onClick={() => startEditBranch(b)}>
                          Editar horarios
                        </button>
                        <button
                          className="danger"
                          onClick={() => deleteBranch(b)}
                        >
                          Borrar
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}
      {admin && canView("calendar") && tab === "calendar" && (
        <section className="calendar-area">
          {canManageDailySchedule && (
            <div className="manual-scheduler">
              <div className="scheduler-head">
              <div>
                <p className="eyebrow">PROGRAMACIÓN MANUAL</p>
                <h2>Horario por día y empleado</h2>
              </div>
              <div className="scheduler-controls">
                <label>
                  Fecha
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => changeScheduleDate(e.target.value)}
                  />
                </label>
                <button
                  className="repeat-schedule-button"
                  aria-expanded={repeatScheduleOpen}
                  onClick={() => setRepeatScheduleOpen((current) => !current)}
                >
                  ↻ REPETIR HORARIO ANTERIOR
                </button>
                <button
                  className="save-schedule"
                  disabled={
                    !Object.keys(scheduleDraft).length || savingSchedule
                  }
                  onClick={saveSchedule}
                >
                  {savingSchedule ? "GUARDANDO…" : "✓ GUARDAR HORARIO"}
                </button>
              </div>
              </div>
              {repeatScheduleOpen && (
                <div className="repeat-schedule-panel">
                  <div>
                    <b>Selecciona el horario que quieres repetir</b>
                    <span>
                      Se cargará como borrador para que puedas mover a cualquier
                      empleado antes de guardarlo.
                    </span>
                  </div>
                  <label>
                    Horario de referencia
                    <select
                      value={repeatScheduleSource}
                      onChange={(event) =>
                        setRepeatScheduleSource(
                          event.target.value as "day" | "week",
                        )
                      }
                    >
                      <option value="week">Mismo día de la semana anterior</option>
                      <option value="day">Día anterior</option>
                    </select>
                  </label>
                  <div className="repeat-schedule-source-date">
                    <small>SE COPIARÁ DEL</small>
                    <strong>{repeatedScheduleDate()}</strong>
                    <span>AL {scheduleDate}</span>
                  </div>
                  <button className="load-repeat-schedule" onClick={loadRepeatedSchedule}>
                    CARGAR PARA EDITAR
                  </button>
                </div>
              )}
              {Object.keys(scheduleDraft).length > 0 && (
              <p className="pending-count">
                {Object.keys(scheduleDraft).length}{" "}
                {Object.keys(scheduleDraft).length === 1
                  ? "empleado pendiente"
                  : "empleados pendientes"}{" "}
                · Los cambios aún no se muestran en el calendario.
              </p>
              )}
              <p className="scheduler-note">
              La aplicación no asigna horarios automáticamente. Selecciona la
              sucursal y el turno de cada persona y pulsa Guardar horario para
              aplicar los cambios.
              </p>
              <div className="scheduler-table">
              <div className="scheduler-row header">
                <span>Empleado</span>
                <span>Sucursal del día</span>
                <span>Turno del día</span>
              </div>
              {[...shown]
                .sort(
                  (a, b) =>
                    shiftRank(draftDaily(a.id).shift) -
                      shiftRank(draftDaily(b.id).shift) ||
                    a.name.localeCompare(b.name, "es"),
                )
                .map((m) => {
                  const a = draftDaily(m.id);
                  return (
                    <div
                      className={`scheduler-row ${scheduleDraft[m.id] ? "pending" : ""}`}
                      key={m.id}
                    >
                      <strong>{m.name}</strong>
                      <select
                        value={a.branch}
                        onChange={(e) =>
                          setDailyDraft(m.id, "branch", e.target.value)
                        }
                      >
                        {branchOptions.map((b) => (
                          <option key={b}>{b}</option>
                        ))}
                      </select>
                      <select
                        value={a.shift}
                        onChange={(e) =>
                          setDailyDraft(m.id, "shift", e.target.value)
                        }
                      >
                        <option>Sin asignar</option>
                        {shifts.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="schedule-view-toggle">
            <button
              className={calendarView === "weekly" ? "active" : ""}
              onClick={() => setCalendarView("weekly")}
            >
              Semanal
            </button>
            <button
              className={calendarView === "fortnightly" ? "active" : ""}
              onClick={() => setCalendarView("fortnightly")}
            >
              Quincenal
            </button>
            <button
              className={calendarView === "monthly" ? "active" : ""}
              onClick={() => setCalendarView("monthly")}
            >
              Mensual
            </button>
          </div>
          {calendarView === "weekly" && (
            <div className="weekly-section">
              <div className="weekly-head">
                <button
                  onClick={() =>
                    setWeekStart(
                      new Date(
                        weekStart.getFullYear(),
                        weekStart.getMonth(),
                        weekStart.getDate() - 7,
                      ),
                    )
                  }
                >
                  ← Semana anterior
                </button>
                <div>
                  <p>HORARIO SEMANAL</p>
                  <h2>
                    {weekDays[0].toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    –{" "}
                    {weekDays[6].toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </h2>
                </div>
                <button
                  onClick={() =>
                    setWeekStart(
                      new Date(
                        weekStart.getFullYear(),
                        weekStart.getMonth(),
                        weekStart.getDate() + 7,
                      ),
                    )
                  }
                >
                  Semana siguiente →
                </button>
              </div>
              <div className="weekly-table">
                <div className="weekly-row weekly-header">
                  <strong>Sucursal</strong>
                  {weekDays.map((d) => (
                    <span key={d.toISOString()}>
                      {d.toLocaleDateString("es-MX", { weekday: "short" })}
                      <b>{d.getDate()}</b>
                    </span>
                  ))}
                </div>
                {branchOptions.map((store) => (
                  <div className="weekly-row" key={store}>
                    <strong>{store}</strong>
                    {weekDays.map((date) => {
                      const key = dateKey(date),
                        assigned = dailyAssignments.filter(
                          (a) =>
                            a.workDate === key &&
                            a.branch === store &&
                            a.shift !== "Sin asignar" &&
                            !attendanceBlockingMovement(a.staffId, key),
                        ),
                        t1 = sortedAssignments(
                          assigned.filter((a) => a.shift.includes("10:00")),
                        ),
                        t2 = sortedAssignments(
                          assigned.filter((a) => a.shift.includes("14:00")),
                        );
                      return (
                        <div className="weekly-cell" key={key}>
                          <em>T1</em>
                          {t1.map((a) => {
                            const m = shown.find((x) => x.id === a.staffId);
                            return m ? (
                              <button
                                className="calendar-employee-link"
                                key={a.id}
                                onClick={() => openEmployeeProfile(m.id)}
                              >
                                {m.name}
                              </button>
                            ) : null;
                          })}
                          <em>T2</em>
                          {t2.map((a) => {
                            const m = shown.find((x) => x.id === a.staffId);
                            return m ? (
                              <button
                                className="calendar-employee-link"
                                key={a.id}
                                onClick={() => openEmployeeProfile(m.id)}
                              >
                                {m.name}
                              </button>
                            ) : null;
                          })}
                          {!assigned.length && <i>Sin asignar</i>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
          {calendarView === "fortnightly" && (
            <div className="weekly-section fortnight-section">
              <div className="weekly-head">
                <button
                  onClick={() =>
                    setWeekStart(
                      new Date(
                        weekStart.getFullYear(),
                        weekStart.getMonth(),
                        weekStart.getDate() - 14,
                      ),
                    )
                  }
                >
                  ← Quincena anterior
                </button>
                <div>
                  <p>HORARIO QUINCENAL</p>
                  <h2>
                    {fortnightDays[0].toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    –{" "}
                    {fortnightDays[13].toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </h2>
                </div>
                <button
                  onClick={() =>
                    setWeekStart(
                      new Date(
                        weekStart.getFullYear(),
                        weekStart.getMonth(),
                        weekStart.getDate() + 14,
                      ),
                    )
                  }
                >
                  Quincena siguiente →
                </button>
              </div>
              <div className="fortnight-table">
                <div className="fortnight-row fortnight-header">
                  <strong>Sucursal</strong>
                  {fortnightDays.map((d) => (
                    <span key={d.toISOString()}>
                      {d.toLocaleDateString("es-MX", { weekday: "short" })}
                      <b>{d.getDate()}</b>
                    </span>
                  ))}
                </div>
                {branchOptions.map((store, index) => (
                  <div className="fortnight-row" key={store}>
                    <strong
                      style={{
                        borderLeftColor:
                          branchColors[index % branchColors.length],
                      }}
                    >
                      {store}
                    </strong>
                    {fortnightDays.map((date) => {
                      const key = dateKey(date),
                        assigned = dailyAssignments.filter(
                          (a) =>
                            a.workDate === key &&
                            a.branch === store &&
                            a.shift !== "Sin asignar" &&
                            !attendanceBlockingMovement(a.staffId, key),
                        ),
                        t1 = sortedAssignments(
                          assigned.filter((a) => a.shift.includes("10:00")),
                        ),
                        t2 = sortedAssignments(
                          assigned.filter((a) => a.shift.includes("14:00")),
                        );
                      return (
                        <div className="fortnight-cell" key={key}>
                          <em>T1</em>
                          {t1.map((a) => {
                            const m = shown.find((x) => x.id === a.staffId);
                            return m ? (
                              <button
                                className="calendar-employee-link"
                                key={a.id}
                                onClick={() => openEmployeeProfile(m.id)}
                              >
                                {m.name}
                              </button>
                            ) : null;
                          })}
                          <em>T2</em>
                          {t2.map((a) => {
                            const m = shown.find((x) => x.id === a.staffId);
                            return m ? (
                              <button
                                className="calendar-employee-link"
                                key={a.id}
                                onClick={() => openEmployeeProfile(m.id)}
                              >
                                {m.name}
                              </button>
                            ) : null;
                          })}
                          {!assigned.length && <i>—</i>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div
            className={
              calendarView === "monthly"
                ? "monthly-section visible"
                : "monthly-section hidden"
            }
          >
            <div className="calendar-head">
              <button
                onClick={() =>
                  setMonthDate(
                    new Date(
                      monthDate.getFullYear(),
                      monthDate.getMonth() - 1,
                      1,
                    ),
                  )
                }
              >
                ←
              </button>
              <div>
                <p>SUCURSALES POR FILA · DÍAS POR COLUMNA</p>
                <h2>
                  {months[monthDate.getMonth()]} {monthDate.getFullYear()}
                </h2>
              </div>
              <button
                onClick={() =>
                  setMonthDate(
                    new Date(
                      monthDate.getFullYear(),
                      monthDate.getMonth() + 1,
                      1,
                    ),
                  )
                }
              >
                →
              </button>
            </div>
            <div className="monthly-table-wrap">
              <div className="monthly-branch-table">
                <div
                  className="monthly-row monthly-header"
                  style={{
                    gridTemplateColumns: `180px repeat(${monthDays.length},96px)`,
                  }}
                >
                  <strong>Sucursal</strong>
                  {monthDays.map((date) => (
                    <span key={dateKey(date)}>
                      {date.toLocaleDateString("es-MX", { weekday: "short" })}
                      <b>{date.getDate()}</b>
                    </span>
                  ))}
                </div>
                {branchOptions.map((store, index) => (
                  <div
                    className="monthly-row"
                    style={{
                      gridTemplateColumns: `180px repeat(${monthDays.length},96px)`,
                    }}
                    key={store}
                  >
                    <strong
                      style={{
                        borderLeftColor:
                          branchColors[index % branchColors.length],
                      }}
                    >
                      {store}
                    </strong>
                    {monthDays.map((date) => {
                      const key = dateKey(date),
                        assigned = dailyAssignments.filter(
                          (a) =>
                            a.workDate === key &&
                            a.branch === store &&
                            a.shift !== "Sin asignar" &&
                            !attendanceBlockingMovement(a.staffId, key),
                        ),
                        t1 = sortedAssignments(
                          assigned.filter((a) => a.shift.includes("10:00")),
                        ),
                        t2 = sortedAssignments(
                          assigned.filter((a) => a.shift.includes("14:00")),
                        );
                      return (
                        <div className="monthly-shift-cell" key={key}>
                          <em>T1</em>
                          {t1.map((a) => {
                            const m = allEmployees.find(
                              (x) => x.id === a.staffId,
                            );
                            return m ? (
                              <button
                                className="calendar-employee-link"
                                key={a.id}
                                onClick={() => openEmployeeProfile(m.id)}
                              >
                                {m.name}
                              </button>
                            ) : null;
                          })}
                          <em>T2</em>
                          {t2.map((a) => {
                            const m = allEmployees.find(
                              (x) => x.id === a.staffId,
                            );
                            return m ? (
                              <button
                                className="calendar-employee-link"
                                key={a.id}
                                onClick={() => openEmployeeProfile(m.id)}
                              >
                                {m.name}
                              </button>
                            ) : null;
                          })}
                          {!assigned.length && <i>—</i>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}{" "}
      {admin && canView("calendar") && tab === "calendar" && (
        <>
          <FacialistTodaySummary
            members={shown}
            assignments={dailyAssignments}
            absences={calendarAbsenceList}
            branches={branchOptions}
          />
          <FacialistCoverageSummary
            dates={
              calendarView === "monthly"
                ? monthDays
                : calendarView === "fortnightly"
                  ? fortnightDays
                  : weekDays
            }
            members={shown}
            assignments={dailyAssignments}
            branches={branchOptions}
            requests={calendarAbsenceList}
          />
          <CalendarVacationSummary
            dates={
              calendarView === "monthly"
                ? monthDays
                : calendarView === "fortnightly"
                  ? fortnightDays
                  : weekDays
            }
            members={shown}
            requests={calendarAbsenceList}
          />
          <CalendarRestSummary
            dates={
              calendarView === "monthly"
                ? monthDays
                : calendarView === "fortnightly"
                  ? fortnightDays
                  : weekDays
            }
            members={shown}
            view={calendarView}
          />
          <CalendarMovementsSummary
            dates={
              calendarView === "monthly"
                ? monthDays
                : calendarView === "fortnightly"
                  ? fortnightDays
                  : weekDays
            }
            members={shown}
            assignments={dailyAssignments}
            movements={calendarAbsenceList}
          />
        </>
      )}
      {!admin && (
        <section className="no-authorized-modules">
          <span>◆</span>
          <h2>Sin módulos autorizados</h2>
          <p>
            Tu usuario está activo, pero todavía no tiene módulos asignados.
            Solicita al Master que habilite únicamente las áreas que necesitas
            consultar.
          </p>
        </section>
      )}
      {!admin && false && tab !== "policies" && tab !== "birthdays" && (
        <section className="roles-area">
          <div className="schedule-head">
            <div>
              <span className="step">01</span>
              <h2>Mis horarios capturados</h2>
            </div>
            <button className="print-button" onClick={() => window.print()}>
              Imprimir / PDF
            </button>
          </div>
          <div className="employee-agenda">
            {dailyAssignments
              .filter(
                (a) =>
                  a.shift !== "Sin asignar" &&
                  a.workDate >= new Date().toISOString().slice(0, 10),
              )
              .sort((a, b) => a.workDate.localeCompare(b.workDate))
              .map((a) => (
                <article key={a.id}>
                  <time>{a.workDate}</time>
                  <div>
                    <b>{a.branch}</b>
                    <span>{a.shift}</span>
                  </div>
                  <a
                    href={assignmentCalendarUrl(a)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google Calendar
                  </a>
                </article>
              ))}
            {!dailyAssignments.some(
              (a) =>
                a.shift !== "Sin asignar" &&
                a.workDate >= new Date().toISOString().slice(0, 10),
            ) && (
              <div className="empty">
                <h3>Sin horarios asignados</h3>
                <p>
                  El administrador todavía no ha capturado tus próximos turnos.
                </p>
              </div>
            )}
          </div>
          {currentVacationBalance && (
            <div className="employee-vacation-balance">
              <span>MODELO DE VACACIONES</span>
              <b>
                {currentVacationBalance.model?.name || "Sin modelo asignado"}
              </b>
              <strong>
                {currentVacationBalance.remaining} días disponibles
              </strong>
              <small>{currentVacationBalance.used} días autorizados</small>
            </div>
          )}
          <div className="employee-request panel">
            <div className="employee-request-head">
              <div>
                <p className="eyebrow">MIS SOLICITUDES</p>
                <h2>Permisos y ausencias</h2>
              </div>
              <button
                className={`request-plus ${requestFormOpen ? "open" : ""}`}
                onClick={() => setRequestFormOpen(!requestFormOpen)}
                aria-label={
                  requestFormOpen ? "Cerrar solicitud" : "Crear nueva solicitud"
                }
              >
                {requestFormOpen ? "×" : "＋ Agregar movimiento"}
              </button>
            </div>
            {requestFormOpen && movementForm(false)}
            <div className="my-request-history">
              <div>
                <b>Historial de solicitudes</b>
                <span>{requestList.length} registros</span>
              </div>
              <div className="my-requests">
                {requestList.map((r) => (
                  <span key={r.id}>
                    <b>{r.requestType}</b>
                    {r.startDate} – {r.endDate}
                    <i>{r.status}</i>
                  </span>
                ))}
                {!requestList.length && (
                  <p>Aún no tienes solicitudes registradas.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
      {admin && canView("employees") && tab === "employees" && (
        <section className="employee-directory">
          <div className="directory-toolbar">
            <div>
              <p className="eyebrow">REGISTRO GENERAL</p>
              <h2>Directorio de empleados</h2>
              <span>
                {allEmployees.length} cuentas · {shown.length} activas
              </span>
            </div>
            <div className="bulk-actions">
              <a href="/plantilla-empleados-keysar.xlsx" download>
                ⇩ Descargar plantilla Excel
              </a>
              <label className={importing ? "uploading" : ""}>
                ↑ {importing ? "Cargando archivo…" : "Carga masiva Excel"}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  disabled={importing}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void importEmployees(file);
                    e.target.value = "";
                  }}
                />
              </label>
              {bulkCredentials.length > 0 && (
                <button onClick={downloadBulkCredentials}>
                  ⇩ Descargar credenciales
                </button>
              )}
            </div>
          </div>
          <SelectionToolbar
            ids={allEmployees.map((member) => member.id)}
            selected={selectedStaffIds}
            onChange={setSelectedStaffIds}
            onDelete={() =>
              bulkDelete("staff", selectedStaffIds, setSelectedStaffIds)
            }
            label="empleados"
          />
          <div className="employee-table">
            <div className="employee-table-head">
              <span>Sel.</span>
              <span>Empleado</span>
              <span>Usuario</span>
              <span>Correo</span>
              <span>Puesto</span>
              <span>Sucursal</span>
              <span>Estado</span>
              <span>Acciones</span>
            </div>
            {allEmployees.map((member) => (
              <article
                className={member.isActive ? "" : "inactive-row"}
                key={member.id}
              >
                <input
                  className="row-selector"
                  type="checkbox"
                  checked={selectedStaffIds.includes(member.id)}
                  onChange={() =>
                    setSelectedStaffIds((current) =>
                      current.includes(member.id)
                        ? current.filter((id) => id !== member.id)
                        : [...current, member.id],
                    )
                  }
                />
                <div>
                  <span className="directory-avatar">
                    {member.name
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <b>{member.name}</b>
                </div>
                <code>{member.username || "Pendiente"}</code>
                <span>
                  {member.invitedEmail || member.email || "Sin correo"}
                </span>
                <span>{member.jobRole}</span>
                <span>{member.branch}</span>
                <button
                  className={`status-toggle ${member.isActive ? "active" : "inactive"}`}
                  onClick={() => toggleStaffStatus(member)}
                >
                  {member.isActive ? "Activo" : "Inactivo"}
                </button>
                <div className="directory-actions">
                  <button onClick={() => editFromDirectory(member)}>
                    Editar
                  </button>
                  <button className="danger" onClick={() => remove(member)}>
                    Borrar
                  </button>
                </div>
              </article>
            ))}
            {!allEmployees.length && (
              <div className="empty">
                <h3>No hay empleados registrados</h3>
                <p>
                  Crea el primer empleado o utiliza la carga masiva desde Excel.
                </p>
              </div>
            )}
          </div>
        </section>
      )}
      {admin && canView("vacations") && tab === "vacations" && (
        <section className="vacation-history">
          <div className="vacation-summary">
            <article>
              <span>REGISTROS</span>
              <b>{vacationRequests.length}</b>
              <small>Solicitudes de vacaciones</small>
            </article>
            <article>
              <span>AUTORIZADAS</span>
              <b>
                {
                  vacationRequests.filter(
                    (request) => request.status === "Autorizado",
                  ).length
                }
              </b>
              <small>Con aprobación</small>
            </article>
            <article>
              <span>DÍAS AUTORIZADOS</span>
              <b>
                {vacationRequests
                  .filter((request) => request.status === "Autorizado")
                  .reduce((total, request) => total + vacationDays(request), 0)}
              </b>
              <small>Total histórico</small>
            </article>
            <article
              className={
                exhaustedVacationBalances.length
                  ? "vacation-summary-alert"
                  : undefined
              }
            >
              <span>SIN SALDO</span>
              <b>{exhaustedVacationBalances.length}</b>
              <small>
                {exhaustedVacationBalances.length
                  ? "Requieren atención"
                  : "Todos con días disponibles"}
              </small>
            </article>
          </div>
          <VacationBalanceHistory
            members={allEmployees}
            models={vacationModels}
            requests={requestList}
          />
          <CustomVacationPanel
            members={allEmployees}
            models={vacationModels}
            requests={requestList}
            canEdit={master}
            onSaved={load}
          />
          <div className="vacation-table">
            <div className="vacation-table-head">
              <span>Empleado</span>
              <span>Periodo</span>
              <span>Días</span>
              <span>Estado</span>
              <span>Solicitud</span>
            </div>
            {vacationRequests.map((request) => {
              const employee = allEmployees.find(
                (member) => member.id === request.staffId,
              );
              return (
                <article key={request.id}>
                  <div>
                    <b>{employee?.name || "Empleado"}</b>
                    <small>
                      {employee?.isActive === false
                        ? "Empleado inactivo"
                        : employee?.jobRole || "Personal"}
                    </small>
                  </div>
                  <span>
                    {request.startDate} → {request.endDate}
                  </span>
                  <strong>{vacationDays(request)}</strong>
                  <i
                    className={`request-status ${request.status.toLowerCase().replace(" ", "-")}`}
                  >
                    {request.status}
                  </i>
                  <div>
                    <span>
                      {new Date(request.createdAt).toLocaleDateString("es-MX")}
                    </span>
                    <small>{request.reason || "Sin comentarios"}</small>
                  </div>
                </article>
              );
            })}
            {!vacationRequests.length && (
              <div className="empty">
                <h3>Sin registros de vacaciones</h3>
                <p>
                  Las solicitudes de vacaciones de todos los empleados
                  aparecerán aquí.
                </p>
              </div>
            )}
          </div>
        </section>
      )}{" "}
      {admin && canView("vacations") && tab === "vacations" && (
        <VacationModelsPanel
          models={vacationModels}
          members={allEmployees}
          requests={requestList}
          master={master}
          onSaved={load}
        />
      )}
      {admin && canView("positions") && tab === "positions" && (
        <JobRolesPanel
          roles={jobRoleList}
          members={allEmployees}
          canEdit={canEdit("positions")}
          canManagePermissions={master}
          onManagePermissions={() => setTab("access")}
          onSaved={load}
        />
      )}
      {admin && tab === "facialists" && canView("facialists") && (
        <FacialistSchedulePanel
          facialists={allEmployees.filter(
            (member) =>
              member.jobRole.toLowerCase().includes("facialista") &&
              (!facialistViewer || member.id === session?.id),
          )}
          assignments={dailyAssignments}
          branches={branchOptions}
          shifts={shifts}
          canEdit={canEdit("facialists")}
          privateView={facialistViewer}
          onSaved={load}
        />
      )}
      {tab === "birthdays" && canView("birthdays") && (
        <BirthdaysPanel
          entries={birthdayEntries}
          companyName={branding.brandName}
        />
      )}
      {tab === "policies" && canView("policies") && (
        <PoliciesPanel
          documents={policyDocuments}
          master={canEdit("policies")}
          onSaved={load}
        />
      )}
      {master && tab === "access" && (
        <PermissionsPanel users={members} onSaved={load} locale={locale} />
      )}
      {birthdayPromptVisible && (
        <div
          className="birthday-prompt-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Registrar fecha de cumpleaños"
        >
          <div className="birthday-prompt">
            <span className="birthday-seal">✦</span>
            <p className="eyebrow">BIENVENIDO A TU PERFIL</p>
            <h2>¿Cuándo es tu cumpleaños?</h2>
            <p>
              Guardaremos la fecha para que la empresa pueda recordarla y
              felicitarte.
            </p>
            <label>
              FECHA DE CUMPLEAÑOS
              <input
                type="date"
                value={birthdayDraft}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setBirthdayDraft(event.target.value)}
              />
            </label>
            <button
              className="gold"
              disabled={!birthdayDraft}
              onClick={saveBirthday}
            >
              GUARDAR CUMPLEAÑOS
            </button>
            <button className="later" onClick={() => setBirthdaySkipped(true)}>
              Recordar después
            </button>
            <small>
              En los recordatorios sólo se mostrará el día y el mes.
            </small>
          </div>
        </div>
      )}
      <footer>
        <span>{branding.brandName}</span>
        <p>Acceso personal y seguro · Ciudad de México</p>
      </footer>
    </main>
  );
}
