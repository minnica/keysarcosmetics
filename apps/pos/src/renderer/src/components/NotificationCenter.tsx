import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  Boxes,
  CheckCheck,
  Clock3,
  Eye,
  LockKeyhole,
  PackageMinus,
  PackagePlus,
  Pencil,
  Plus,
  ReceiptText,
  ShieldAlert,
  ShoppingCart,
  UserRoundCheck,
  WalletCards,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@cosmetics/ui";
import type {
  OperationalNotification,
  OperationalNotificationAccess,
  OperationalNotificationPreference,
  OperationalNotificationType,
  MasterUser,
  Seller,
} from "../types";

interface NotificationDefinition {
  type: OperationalNotificationType;
  label: string;
  description: string;
  module: string;
  icon: typeof Bell;
}

export const notificationDefinitions: NotificationDefinition[] = [
  {
    type: "SALE_COMPLETED",
    label: "Ventas finalizadas",
    description: "Nuevo ticket, cliente, vendedor y total de la operación.",
    module: "Sale",
    icon: ShoppingCart,
  },
  {
    type: "CASH_EXPENSE",
    label: "Registros de caja",
    description: "Altas, ediciones y anulaciones de gastos en Cash Manager.",
    module: "Cash manager",
    icon: WalletCards,
  },
  {
    type: "PRODUCT_CREATED",
    label: "Alta de productos",
    description: "Productos o servicios nuevos dados de alta en catálogo.",
    module: "Inventory · Catálogo",
    icon: PackagePlus,
  },
  {
    type: "INVENTORY_ADD",
    label: "Entradas de inventario",
    description: "Producto sumado y sucursal afectada después de aprobación.",
    module: "Inventory · Movimientos",
    icon: PackagePlus,
  },
  {
    type: "INVENTORY_REMOVE",
    label: "Bajas de inventario",
    description: "Bajas, daños, testers, regalos y otras salidas autorizadas.",
    module: "Inventory · Movimientos",
    icon: PackageMinus,
  },
  {
    type: "INVENTORY_TRANSFER",
    label: "Transferencias",
    description: "Movimientos de producto entre sucursales.",
    module: "Inventory · Movimientos",
    icon: Boxes,
  },
  {
    type: "CLOSE_DAY",
    label: "Cierre de día",
    description: "Corte realizado, venta, gastos y total neto de la sucursal.",
    module: "Close day",
    icon: ReceiptText,
  },
  {
    type: "CLOCK_IN",
    label: "Clock In",
    description: "Hora de entrada y sucursal de cada vendedor.",
    module: "Clock In",
    icon: Clock3,
  },
];

export const createDefaultNotificationPreferences = (
  masterUserId: string,
): OperationalNotificationPreference[] =>
  notificationDefinitions.map((definition) => ({
    type: definition.type,
    enabled: true,
    recipientUserIds: [masterUserId],
    recipientAccess: { [masterUserId]: "EDIT" },
  }));

const businessDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));

const today = () => businessDate(new Date().toISOString());

const notificationTime = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

interface NotificationUser {
  id: string;
  name: string;
  initials: string;
  accessCode: string;
}

interface NotificationBellProps {
  notifications: OperationalNotification[];
  preferences: OperationalNotificationPreference[];
  masterUser: MasterUser;
  sellers: Seller[];
  isMasterCode: (code: string) => boolean;
  onMarkRead: (notificationId: string, userId: string) => void;
  onMarkAllRead: (userId: string) => void;
  apiMode?: boolean;
}

export function NotificationBell({
  notifications,
  preferences,
  masterUser,
  sellers,
  isMasterCode,
  onMarkRead,
  onMarkAllRead,
  apiMode = false,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [authorizedUserId, setAuthorizedUserId] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [readFilter, setReadFilter] = useState<"ALL" | "UNREAD">("ALL");
  const users: NotificationUser[] = [
    masterUser,
    ...sellers.filter((seller) => seller.active),
  ];
  useEffect(() => {
    if (apiMode) setAuthorizedUserId(masterUser.id);
  }, [apiMode, masterUser.id]);
  const authorizedUser = users.find((user) => user.id === authorizedUserId) ?? null;
  const masterViewer = authorizedUserId === masterUser.id;
  const permittedSellerIds = new Set(
    preferences.flatMap((preference) => preference.recipientUserIds),
  );
  const todayNotifications = useMemo(
    () =>
      notifications
        .filter((notification) => businessDate(notification.createdAtIso) === today())
        .filter(
          (notification) =>
            Boolean(authorizedUserId) &&
            (masterViewer || notification.recipientUserIds.includes(authorizedUserId!)),
        )
        .filter(
          (notification) =>
            moduleFilter === "ALL" || notification.type === moduleFilter,
        )
        .filter(
          (notification) =>
            readFilter === "ALL" ||
            !notification.readByUserIds.includes(authorizedUserId!),
        )
        .sort((left, right) => right.createdAtIso.localeCompare(left.createdAtIso)),
    [authorizedUserId, masterViewer, moduleFilter, notifications, readFilter],
  );
  const unreadCount = authorizedUserId ? notifications.filter(
    (notification) =>
      businessDate(notification.createdAtIso) === today() &&
      (masterViewer || notification.recipientUserIds.includes(authorizedUserId)) &&
      !notification.readByUserIds.includes(authorizedUserId),
  ).length : 0;

  const authorizeViewer = () => {
    if (apiMode) return;
    const code = accessCode.trim();
    if (isMasterCode(code)) {
      setAuthorizedUserId(masterUser.id);
      setAccessCode("");
      toast.success("Centro de notificaciones abierto con acceso master.");
      window.setTimeout(() => {
        setAuthorizedUserId(null);
        setOpen(false);
      }, 180_000);
      return;
    }
    const seller = sellers.find(
      (candidate) => candidate.active && candidate.accessCode === code,
    );
    if (!seller || !permittedSellerIds.has(seller.id)) {
      toast.error("Usuario sin permiso para consultar notificaciones.");
      return;
    }
    setAuthorizedUserId(seller.id);
    setAccessCode("");
    toast.success(`Notificaciones abiertas para ${seller.name}.`);
    window.setTimeout(() => {
      setAuthorizedUserId(null);
      setOpen(false);
    }, 180_000);
  };

  const lockViewer = () => {
    if (!apiMode) setAuthorizedUserId(null);
    setAccessCode("");
    setOpen(false);
    setModuleFilter("ALL");
    setReadFilter("ALL");
  };

  const recipientNames = (ids: string[]) =>
    ids
      .map((id) => users.find((user) => user.id === id)?.name)
      .filter(Boolean)
      .join(" · ");

  return (
    <div className="notification-center-shell">
      <button
        type="button"
        className={`header-notification-button ${open ? "is-active" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-label={
          authorizedUser
            ? `Notificaciones del día${unreadCount > 0 ? `, ${unreadCount} sin leer` : ""}`
            : "Notificaciones protegidas"
        }
        aria-expanded={open}
      >
        {authorizedUser ? (
          unreadCount > 0 ? <BellRing size={20} /> : <Bell size={20} />
        ) : (
          <LockKeyhole size={19} />
        )}
        {unreadCount > 0 && <span>{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="notification-backdrop"
            aria-label="Cerrar notificaciones"
            onClick={() => setOpen(false)}
          />
          <section className="notification-panel" aria-label="Centro de notificaciones">
            {!authorizedUser ? (
              <div className="notification-access-gate">
                <span className="notification-access-icon"><BellRing size={25} /></span>
                <span className="section-kicker">ACCESO PROTEGIDO</span>
                <h2>Centro de notificaciones</h2>
                <p>
                  Ingresa un código master o el código de un usuario autorizado en
                  Settings. Cada usuario verá únicamente las alertas que recibe.
                </p>
                <Input
                  type="password"
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  placeholder="Código de acceso"
                  aria-label="Código para abrir notificaciones"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") authorizeViewer();
                  }}
                />
                <Button type="button" onClick={authorizeViewer} disabled={!accessCode.trim()}>
                  <LockKeyhole size={16} /> Abrir notificaciones
                </Button>
                <button type="button" className="notification-access-close" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <>
            <div className="notification-panel-heading">
              <div>
                <span className="section-kicker">ACTIVIDAD DEL DÍA</span>
                <h2>Notificaciones</h2>
                <p>{authorizedUser.name} · {unreadCount} no leídas</p>
              </div>
              <div>
                <button type="button" onClick={lockViewer} aria-label="Bloquear notificaciones" title="Cerrar acceso">
                  <LockKeyhole size={16} />
                </button>
                <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="notification-panel-tools">
              <select
                aria-label="Filtrar notificaciones por módulo"
                value={moduleFilter}
                onChange={(event) => setModuleFilter(event.target.value)}
              >
                <option value="ALL">Todos los módulos</option>
                {notificationDefinitions.map((definition) => (
                  <option value={definition.type} key={definition.type}>
                    {definition.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filtrar notificaciones por lectura"
                value={readFilter}
                onChange={(event) => setReadFilter(event.target.value as "ALL" | "UNREAD")}
              >
                <option value="ALL">Todas</option>
                <option value="UNREAD">Sólo no leídas</option>
              </select>
              <button type="button" onClick={() => onMarkAllRead(authorizedUser.id)} disabled={unreadCount === 0}>
                <CheckCheck size={15} /> Marcar leídas
              </button>
            </div>

            <div className="notification-list">
              {todayNotifications.map((notification) => {
                const definition = notificationDefinitions.find(
                  (item) => item.type === notification.type,
                );
                const Icon = definition?.icon ?? Bell;
                const unread =
                  !notification.readByUserIds.includes(authorizedUser.id);
                return (
                  <button
                    type="button"
                    className={`notification-item ${unread ? "is-unread" : ""}`}
                    key={notification.id}
                    onClick={() => onMarkRead(notification.id, authorizedUser.id)}
                  >
                    <span className="notification-item-icon"><Icon size={18} /></span>
                    <span className="notification-item-copy">
                      <span>
                        <strong>{notification.title}</strong>
                        <time>{notificationTime(notification.createdAtIso)}</time>
                      </span>
                      <small>{notification.detail}</small>
                      <em>
                        {notification.moduleLabel} · {notification.branch} · {notification.actorName}
                      </em>
                      <b>Para: {recipientNames(notification.recipientUserIds) || "Sin destinatarios"}</b>
                    </span>
                    {unread && <i aria-label="Sin leer" />}
                  </button>
                );
              })}
              {todayNotifications.length === 0 && (
                <div className="notification-empty-state">
                  <Bell size={26} />
                  <strong>Sin movimientos en esta vista</strong>
                  <span>Las nuevas operaciones aparecerán aquí en tiempo real.</span>
                </div>
              )}
            </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

interface NotificationSettingsProps {
  preferences: OperationalNotificationPreference[];
  sellers: Seller[];
  masterUser: NotificationUser;
  isMasterCode: (code: string) => boolean;
  onChange: (preferences: OperationalNotificationPreference[]) => void;
  apiMode?: boolean;
}

export function NotificationSettings({
  preferences,
  sellers,
  masterUser,
  isMasterCode,
  onChange,
  apiMode = false,
}: NotificationSettingsProps) {
  const [authorized, setAuthorized] = useState(false);
  const canEdit = apiMode || authorized;
  const [accessCode, setAccessCode] = useState("");
  const [recipientDrafts, setRecipientDrafts] = useState<
    Partial<Record<OperationalNotificationType, string>>
  >({});
  const [accessDrafts, setAccessDrafts] = useState<
    Partial<Record<OperationalNotificationType, OperationalNotificationAccess>>
  >({});
  const users = [masterUser, ...sellers.filter((seller) => seller.active)];
  const usersWithoutPermissions = sellers.filter(
    (seller) =>
      seller.active &&
      !preferences.some(
        (preference) =>
          preference.enabled && preference.recipientUserIds.includes(seller.id),
      ),
  );

  const updatePreference = (
    type: OperationalNotificationType,
    update: (current: OperationalNotificationPreference) => OperationalNotificationPreference,
  ) =>
    onChange(
      preferences.map((preference) =>
        preference.type === type ? update(preference) : preference,
      ),
    );

  const authorize = () => {
    if (!isMasterCode(accessCode)) {
      toast.error("Código master incorrecto.");
      return;
    }
    setAuthorized(true);
    setAccessCode("");
    toast.success("Configuración de notificaciones desbloqueada.");
    window.setTimeout(() => setAuthorized(false), 180_000);
  };

  const assignRecipient = (
    type: OperationalNotificationType,
  ) => {
    const userId = recipientDrafts[type];
    if (!userId) {
      toast.error("Selecciona un vendedor antes de asignar el permiso.");
      return;
    }
    const access = accessDrafts[type] ?? "VIEW";
    updatePreference(type, (current) => ({
      ...current,
      recipientUserIds: current.recipientUserIds.includes(userId)
        ? current.recipientUserIds
        : [...current.recipientUserIds, userId],
      recipientAccess: {
        ...current.recipientAccess,
        [userId]: access,
      },
    }));
    setRecipientDrafts((current) => ({ ...current, [type]: "" }));
    toast.success(
      `${users.find((user) => user.id === userId)?.name ?? "Usuario"}: permiso de ${access === "EDIT" ? "edición" : "visualización"} asignado.`,
    );
  };

  const removeRecipient = (
    type: OperationalNotificationType,
    userId: string,
  ) =>
    updatePreference(type, (current) => {
      const recipientAccess = { ...current.recipientAccess };
      delete recipientAccess[userId];
      return {
        ...current,
        recipientUserIds: current.recipientUserIds.filter((id) => id !== userId),
        recipientAccess,
      };
    });

  return (
    <Card className="settings-card notification-settings-card">
      <CardContent>
        <div className="notification-settings-heading">
          <div>
            <span className="section-kicker">SISTEMA · ALERTAS</span>
            <h2>Notificaciones por usuario</h2>
            <p>
              Elige qué movimientos generan campana y quién los recibe. Los cambios
              aplican sólo a eventos nuevos y conservan el historial anterior. Seleccionar
              un vendedor también le concede acceso a la campana con su código personal.
            </p>
          </div>
          <BellRing size={24} />
        </div>

        {!canEdit ? (
          <div className="notification-settings-lock">
            <span><LockKeyhole size={19} /></span>
            <div>
              <strong>Configuración protegida</strong>
              <small>Ingresa un código master para editar módulos y destinatarios.</small>
            </div>
            <Input
              type="password"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              placeholder="Código master"
              aria-label="Código master de notificaciones"
              onKeyDown={(event) => {
                if (event.key === "Enter") authorize();
              }}
            />
            <Button type="button" onClick={authorize} disabled={!accessCode.trim()}>
              Desbloquear
            </Button>
          </div>
        ) : (
          <div className="notification-preference-list">
            {usersWithoutPermissions.length > 0 && (
              <div className="notification-unassigned-alert" role="alert">
                <ShieldAlert size={19} />
                <span>
                  <strong>Usuarios sin permisos de notificación</strong>
                  <small>
                    {usersWithoutPermissions.map((seller) => seller.name).join(" · ")}
                  </small>
                </span>
                <Badge variant="outline">{usersWithoutPermissions.length} SIN ASIGNAR</Badge>
              </div>
            )}
            {notificationDefinitions.map((definition) => {
              const preference = preferences.find(
                (item) => item.type === definition.type,
              ) ?? {
                type: definition.type,
                enabled: false,
                recipientUserIds: [],
              };
              const Icon = definition.icon;
              return (
                <article
                  className={`notification-preference-row ${preference.enabled ? "is-active" : ""} ${preference.enabled && preference.recipientUserIds.length === 0 ? "has-no-recipients" : ""}`}
                  key={definition.type}
                >
                  <span className="notification-preference-icon"><Icon size={19} /></span>
                  <div className="notification-preference-copy">
                    <span>
                      <strong>{definition.label}</strong>
                      <Badge variant="outline">{definition.module}</Badge>
                    </span>
                    <small>{definition.description}</small>
                    <div className="notification-recipient-picker">
                      <Select
                        value={recipientDrafts[definition.type] ?? ""}
                        onValueChange={(userId) =>
                          setRecipientDrafts((current) => ({
                            ...current,
                            [definition.type]: userId,
                          }))
                        }
                        disabled={!preference.enabled}
                      >
                        <SelectTrigger aria-label={`Seleccionar vendedor para ${definition.label}`}>
                          <SelectValue placeholder="Seleccionar vendedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={accessDrafts[definition.type] ?? "VIEW"}
                        onValueChange={(access) =>
                          setAccessDrafts((current) => ({
                            ...current,
                            [definition.type]: access as OperationalNotificationAccess,
                          }))
                        }
                        disabled={!preference.enabled}
                      >
                        <SelectTrigger aria-label={`Tipo de permiso para ${definition.label}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VIEW">Visualiza</SelectItem>
                          <SelectItem value="EDIT">Edición</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="icon"
                        className="icon-action-button"
                        disabled={!preference.enabled || !recipientDrafts[definition.type]}
                        onClick={() => assignRecipient(definition.type)}
                        aria-label={`Asignar permiso en ${definition.label}`}
                        title="Asignar permiso"
                      >
                        <Plus size={15} />
                      </Button>
                    </div>
                    <div className="notification-recipient-list">
                      {preference.recipientUserIds.map((userId) => {
                        const user = users.find((candidate) => candidate.id === userId);
                        if (!user) return null;
                        const access = preference.recipientAccess?.[userId] ??
                          (userId === masterUser.id ? "EDIT" : "VIEW");
                        return (
                          <span className="notification-recipient-permission" key={userId}>
                            <i>{user.initials}</i>
                            <span><strong>{user.name}</strong><small>{access === "EDIT" ? "Edición" : "Visualiza"}</small></span>
                            {access === "EDIT" ? <Pencil size={13} /> : <Eye size={13} />}
                            <button
                              type="button"
                              disabled={!preference.enabled}
                              onClick={() => removeRecipient(definition.type, userId)}
                              aria-label={`Quitar permiso de ${user.name}`}
                              title="Quitar permiso"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        );
                      })}
                      {preference.recipientUserIds.length === 0 && (
                        <span className="notification-no-recipient"><ShieldAlert size={13} /> Sin usuarios asignados</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={preference.enabled}
                    className={`mock-switch ${preference.enabled ? "is-on" : ""}`}
                    onClick={() =>
                      updatePreference(definition.type, (current) => ({
                        ...current,
                        enabled: !current.enabled,
                        recipientUserIds: current.recipientUserIds,
                      }))
                    }
                  >
                    <i />
                  </button>
                </article>
              );
            })}
            <div className="notification-settings-footer">
              <UserRoundCheck size={17} />
              <span>Las notificaciones nuevas se enviarán únicamente a los usuarios seleccionados.</span>
              <Button type="button" variant="outline" onClick={() => setAuthorized(false)}>
                Bloquear
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
