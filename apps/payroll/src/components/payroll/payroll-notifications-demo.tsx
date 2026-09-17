"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BellRing,
  Check,
  Clock3,
  Edit3,
  Gift,
  HandCoins,
  MessageSquareText,
  ReceiptText,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  UsersRound,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
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
  Textarea,
  toast,
} from "@cosmetics/ui";
import {
  type DemoNotificationTemplate,
  roleHasPermission,
  usePayrollDemo,
} from "./payroll-demo-context";

const audienceLabels: Record<
  DemoNotificationTemplate["audience"][number],
  string
> = {
  EMPLOYEE: "EMPLEADO",
  MANAGER: "GERENCIA",
  MASTER: "MÁSTER",
};

const tokenSamples: Record<string, string> = {
  "{nombre}": "ANA SOFÍA MARTÍNEZ",
  "{monto}": "$8,570.00",
  "{sucursal}": "POLANCO",
  "{acumulado}": "$67,700.00",
  "{concepto}": "BONO DE PRODUCTIVIDAD",
  "{periodo}": "1–15 DE SEPTIEMBRE",
  "{faltante}": "$4,300.00",
  "{fecha_fin}": "30/09/2026",
  "{estatus}": "AUTORIZADA",
  "{folio}": "REC-2026-0915",
};

const moduleIcons = {
  sales: ShoppingBag,
  bonuses: Gift,
  payroll: Send,
  receipts: ReceiptText,
  loans: HandCoins,
} as const;

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function renderPreview(message: string) {
  return Object.entries(tokenSamples).reduce(
    (preview, [token, value]) => preview.replaceAll(token, value),
    message,
  );
}

function EditNotificationDialog({
  template,
  open,
  onOpenChange,
}: {
  template: DemoNotificationTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateNotificationTemplate } = usePayrollDemo();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!template) return;
    setTitle(template.title);
    setMessage(template.message);
  }, [template]);

  function appendToken(token: string) {
    setMessage((current) => `${current.trimEnd()} ${token}`.trimStart());
  }

  function save() {
    if (!template || !title.trim() || !message.trim()) {
      toast.error("Captura el título y el mensaje de la notificación.");
      return;
    }
    updateNotificationTemplate(template.id, { title, message });
    toast.success(
      "Mensaje actualizado. El módulo quedó pendiente de nueva aprobación.",
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar notificación push</DialogTitle>
          <DialogDescription>
            Modifica el texto que verá el usuario. Al guardar, la aprobación del
            módulo se retira hasta que un usuario autorizado vuelva a aprobarlo.
          </DialogDescription>
        </DialogHeader>

        {template && (
          <div className="space-y-5 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{template.moduleLabel}</Badge>
              <Badge variant="outline">{template.eventLabel}</Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-title">Título emergente</Label>
              <Input
                id="notification-title"
                value={title}
                maxLength={70}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ej. Venta registrada"
              />
              <p className="text-right text-[10px] text-[color:var(--text-muted)]">
                {title.length}/70
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-message">Mensaje</Label>
              <Textarea
                id="notification-message"
                value={message}
                maxLength={240}
                rows={5}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Escribe el mensaje para el usuario"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] text-[color:var(--text-muted)]">
                  Variables disponibles
                </p>
                <p className="text-[10px] text-[color:var(--text-muted)]">
                  {message.length}/240
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(tokenSamples).map((token) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => appendToken(token)}
                    className="rounded-lg border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/30 px-2 py-1 text-[10px] font-semibold text-[#896443] hover:border-[#b88b61]"
                  >
                    {token}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#c7a47d]/45 bg-[linear-gradient(145deg,#28211c,#3b2d23)] p-4 text-white shadow-lg">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e7cba8]/25 bg-white/[0.08] text-[#f1d2ab]">
                  <BellRing className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold">
                    {title || "Título de la notificación"}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[#ddd0c2]">
                    {renderPreview(message) || "Vista previa del mensaje."}
                  </p>
                  <p className="mt-2 text-[9px] uppercase tracking-[0.12em] text-[#c8a57f]">
                    Keysar Payroll · ahora
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save}>
            <Check className="mr-2 h-4 w-4" />
            Guardar para aprobación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PayrollNotificationsDemo() {
  const { state, setNotificationModuleApproval } = usePayrollDemo();
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedTemplate, setSelectedTemplate] =
    useState<DemoNotificationTemplate | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const activeEmployee = state.employees.find(
    (employee) => employee.id === state.activeEmployeeId,
  );
  const activeRole = state.roles.find(
    (role) => role.id === activeEmployee?.roleId,
  );
  const canManage = roleHasPermission(activeRole, "notifications.manage");

  const modules = useMemo(() => {
    const grouped = new Map<string, DemoNotificationTemplate[]>();
    state.notificationTemplates.forEach((template) => {
      grouped.set(template.moduleId, [
        ...(grouped.get(template.moduleId) ?? []),
        template,
      ]);
    });
    return Array.from(grouped.entries()).map(([moduleId, templates]) => ({
      moduleId,
      label: templates[0]?.moduleLabel ?? moduleId,
      templates,
      approved: templates.every((template) => template.approved),
    }));
  }, [state.notificationTemplates]);

  const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");
  const filteredModules = modules
    .filter(
      (module) => moduleFilter === "ALL" || module.moduleId === moduleFilter,
    )
    .filter(
      (module) =>
        statusFilter === "ALL" ||
        (statusFilter === "APPROVED" ? module.approved : !module.approved),
    )
    .map((module) => ({
      ...module,
      templates: module.templates.filter(
        (template) =>
          !normalizedSearch ||
          `${template.title} ${template.message} ${template.eventLabel} ${template.moduleLabel}`
            .toLocaleLowerCase("es-MX")
            .includes(normalizedSearch),
      ),
    }))
    .filter((module) => module.templates.length > 0);

  const approvedModules = modules.filter((module) => module.approved).length;
  const eligibleUsers = state.employees.filter(
    (employee) => employee.active,
  ).length;

  function toggleModule(moduleId: string, approved: boolean, label: string) {
    if (!canManage) {
      toast.error("Tu rol sólo puede consultar esta configuración.");
      return;
    }
    setNotificationModuleApproval(moduleId, approved);
    toast.success(
      approved
        ? `${label}: notificaciones push aprobadas.`
        : `${label}: envío pausado hasta nueva aprobación.`,
    );
  }

  function openEditor(template: DemoNotificationTemplate) {
    if (!canManage) {
      toast.error("Necesitas permiso para editar notificaciones.");
      return;
    }
    setSelectedTemplate(template);
    setEditOpen(true);
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline">CONFIGURACIÓN</Badge>
          <span className="text-xs text-[color:var(--text-muted)]">
            Plantillas push y autorización por módulo
          </span>
          {!canManage && <Badge variant="outline">SÓLO LECTURA</Badge>}
        </div>
        <h1 className="page-title">Notificaciones</h1>
        <p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">
          Controla qué avisos reciben vendedores, gerentes y usuarios máster,
          revisa su mensaje y aprueba cada módulo antes de habilitar el envío.
        </p>
      </header>

      <Card className="overflow-hidden border-[#b78a60]/45 bg-[linear-gradient(115deg,#29221d,#4a3729)] text-white">
        <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08] text-[#efcda5]">
              <Smartphone className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">
                Entrega protegida al portal móvil
              </p>
              <p className="mt-1 max-w-2xl text-[11px] leading-5 text-[#d8c9ba]">
                Con la sesión activa, el aviso aparece dentro del portal. La
                entrega con el navegador cerrado requerirá servicio push,
                permisos del dispositivo y registro seguro del token.
              </p>
            </div>
          </div>
          <Badge className="w-fit border border-amber-200/30 bg-amber-200/10 text-amber-100">
            CONFIGURACIÓN MOCK
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: BellRing,
            label: "Plantillas push",
            value: state.notificationTemplates.length,
            detail: "mensajes configurados",
          },
          {
            icon: BadgeCheck,
            label: "Módulos aprobados",
            value: approvedModules,
            detail: `de ${modules.length} módulos`,
          },
          {
            icon: Clock3,
            label: "Por revisar",
            value: modules.length - approvedModules,
            detail: "módulos pendientes",
          },
          {
            icon: UsersRound,
            label: "Usuarios elegibles",
            value: eligibleUsers,
            detail: "sesiones activables",
          },
        ].map(({ icon: Icon, label, value, detail }) => (
          <Card key={label} className="border-[color:var(--border-color)]">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c5a37f]/40 bg-[#c5a37f]/10 text-[#8a6542]">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                  {label}
                </p>
                <p className="number-display text-xl leading-tight">
                  {value}{" "}
                  <span className="text-[10px] font-normal text-[color:var(--text-muted)]">
                    {detail}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-[color:var(--border-color)]">
        <CardHeader className="pb-3">
          <CardTitle className="section-heading uppercase">
            Buscar y filtrar
          </CardTitle>
          <CardDescription>
            Consulta la aprobación vigente y localiza cualquier mensaje.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10"
              placeholder="BUSCAR EVENTO O TEXTO DEL MENSAJE"
              aria-label="Buscar notificaciones"
            />
          </div>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger aria-label="Filtrar por módulo">
              <SelectValue placeholder="Todos los módulos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">TODOS LOS MÓDULOS</SelectItem>
              {modules.map((module) => (
                <SelectItem key={module.moduleId} value={module.moduleId}>
                  {module.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Filtrar por aprobación">
              <SelectValue placeholder="Todos los estatus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">TODOS LOS ESTATUS</SelectItem>
              <SelectItem value="APPROVED">APROBADOS</SelectItem>
              <SelectItem value="PENDING">PENDIENTES</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <section className="space-y-4">
        {filteredModules.map((module) => {
          const Icon =
            moduleIcons[module.moduleId as keyof typeof moduleIcons] ??
            BellRing;
          return (
            <Card
              key={module.moduleId}
              className="overflow-hidden border-[color:var(--border-color)]"
            >
              <CardHeader
                className={`border-b border-[color:var(--border-color)] pb-4 ${module.approved ? "bg-emerald-50/65 dark:bg-emerald-950/15" : "bg-amber-50/65 dark:bg-amber-950/15"}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${module.approved ? "border-emerald-300 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200" : "border-amber-300 bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200"}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-sm uppercase tracking-[0.06em]">
                          {module.label}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={
                            module.approved
                              ? "border-emerald-300 text-emerald-700 dark:text-emerald-300"
                              : "border-amber-300 text-amber-700 dark:text-amber-300"
                          }
                        >
                          {module.approved ? "PUSH APROBADO" : "PENDIENTE"}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1">
                        {module.templates.length} eventos configurados · la
                        aprobación aplica a todo el módulo.
                      </CardDescription>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={module.approved}
                    disabled={!canManage}
                    onClick={() =>
                      toggleModule(
                        module.moduleId,
                        !module.approved,
                        module.label,
                      )
                    }
                    className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${module.approved ? "border-emerald-300 bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/25 dark:text-emerald-200" : "border-amber-300 bg-amber-100/80 text-amber-900 dark:bg-amber-950/25 dark:text-amber-200"}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`relative h-5 w-9 rounded-full ${module.approved ? "bg-emerald-600" : "bg-amber-400"}`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${module.approved ? "translate-x-[18px]" : "translate-x-0.5"}`}
                      />
                    </span>
                    <span>
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.08em]">
                        {module.approved ? "Módulo aprobado" : "Aprobar módulo"}
                      </span>
                      <span className="block text-[9px] opacity-75">
                        {module.approved
                          ? "Envío habilitado"
                          : "Envío detenido"}
                      </span>
                    </span>
                  </button>
                </div>
              </CardHeader>
              <CardContent className="divide-y divide-[color:var(--border-color)] p-0">
                {module.templates.map((template) => (
                  <article
                    key={template.id}
                    className="grid gap-4 p-4 lg:grid-cols-[210px_minmax(0,1fr)_190px_auto] lg:items-center"
                  >
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9a744c]">
                        {template.eventLabel}
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {template.title}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/20 px-3 py-2.5">
                      <div className="flex items-start gap-2">
                        <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9a744c]" />
                        <p className="text-[11px] leading-5 text-[color:var(--text-secondary)]">
                          {template.message}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {template.audience.map((audience) => (
                          <Badge
                            key={audience}
                            variant="outline"
                            className="px-1.5 py-0 text-[8px]"
                          >
                            {audienceLabels[audience]}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-[9px] leading-4 text-[color:var(--text-muted)]">
                        {formatTimestamp(template.updatedAt)}
                        <br />
                        {template.updatedBy}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full lg:w-auto"
                      disabled={!canManage}
                      onClick={() => openEditor(template)}
                    >
                      <Edit3 className="mr-2 h-3.5 w-3.5" />
                      Editar mensaje
                    </Button>
                  </article>
                ))}
              </CardContent>
            </Card>
          );
        })}

        {filteredModules.length === 0 && (
          <Card className="border-dashed border-[color:var(--border-color)]">
            <CardContent className="py-12 text-center">
              <Search className="mx-auto h-6 w-6 text-[color:var(--text-muted)]" />
              <p className="mt-3 text-sm font-semibold">
                No hay notificaciones con esos filtros
              </p>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                Cambia el módulo, estatus o texto de búsqueda.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      <Card className="border-[#b4cbbd] bg-emerald-50/45 dark:bg-emerald-950/10">
        <CardContent className="flex items-start gap-3 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div>
            <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">
              Regla de autorización
            </p>
            <p className="mt-1 text-[11px] leading-5 text-emerald-800/80 dark:text-emerald-200/75">
              Una modificación de título o mensaje retira automáticamente la
              aprobación del módulo. Ningún aviso editado vuelve a enviarse
              hasta que el responsable lo autorice nuevamente.
            </p>
          </div>
        </CardContent>
      </Card>

      <EditNotificationDialog
        template={selectedTemplate}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
