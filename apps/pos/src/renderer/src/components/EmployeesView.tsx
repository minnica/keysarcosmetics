import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  KeyRound,
  LockKeyhole,
  PencilLine,
  Plus,
  Power,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  UsersRound,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
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
  toast,
} from "@cosmetics/ui";
import { masterUser } from "../mock-data";
import type {
  EmployeeConfigurationPermission,
  EmployeeRole,
  ScreenId,
  Seller,
} from "../types";

interface EmployeesViewProps {
  authorized: boolean;
  roles: EmployeeRole[];
  sellers: Seller[];
  onAuthorize: (code: string) => boolean;
  onLock: () => void;
  onSaveRole: (role: EmployeeRole) => void;
  onSaveSeller: (seller: Seller) => boolean;
  onToggleRole: (roleId: string) => void;
  onAssignRole: (sellerId: string, roleId: string) => void;
  onSetMasterAccess: (sellerIds: string[], code: string | null) => boolean;
}

const moduleOptions: Array<{
  id: ScreenId;
  label: string;
  description: string;
  masterOnly?: boolean;
}> = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Control ejecutivo y auditoría diaria de inventario.",
  },
  { id: "sale", label: "Sale", description: "Captura y cobro de ventas." },
  { id: "seller-sales", label: "Mis ventas", description: "Ventas y cartera propia." },
  { id: "receipts", label: "Receipts", description: "Consulta e impresión de tickets." },
  { id: "customers", label: "Customers", description: "Directorio y expedientes." },
  { id: "appointments", label: "Citas", description: "Agenda y cortesías." },
  { id: "inventory", label: "Inventory", description: "Productos, stock y pedidos." },
  { id: "warehouse", label: "Almacén bodega", description: "Existencias matriz, entradas, envíos y pedidos." },
  { id: "suppliers", label: "Proveedores", description: "Datos fiscales, productos y compras con costos protegidos." },
  { id: "catalog", label: "Catálogo", description: "Consulta compacta del catálogo." },
  { id: "inventory-movements", label: "Movimientos", description: "Altas, bajas y transferencias." },
  { id: "deals", label: "Deal", description: "Paquetes y promociones autorizadas." },
  { id: "settings", label: "Settings", description: "Configuraciones permitidas para el rol." },
  { id: "x-report", label: "X-Report", description: "Corte y operación del día." },
  { id: "reports", label: "Reports", description: "Centro de reportes ejecutivos." },
  { id: "cash-manager", label: "Cash manager", description: "Operación de caja." },
  { id: "clock-in", label: "Clock In", description: "Registro de asistencia." },
  { id: "close-day", label: "Close day", description: "Cierre operativo diario." },
  { id: "competition", label: "Competition", description: "Ranking y competiciones." },
  { id: "websites", label: "Websites", description: "Accesos web configurados." },
  { id: "data-update", label: "Data update", description: "Sincronización de módulos." },
  {
    id: "employees",
    label: "Employees",
    description: "Siempre exige código master.",
    masterOnly: true,
  },
  {
    id: "my-account",
    label: "My Account",
    description: "Siempre exige código master.",
    masterOnly: true,
  },
];

const configurationOptions: Array<{
  id: EmployeeConfigurationPermission;
  label: string;
  description: string;
}> = [
  { id: "TICKET", label: "Ticket e impresión", description: "Logo, dirección, textos e IVA." },
  { id: "INVENTORY_CATALOG", label: "Catálogo de inventario", description: "Familias, categorías y productos." },
  { id: "INVENTORY_AUDIT", label: "Conteo real de inventario", description: "Existencias físicas, diferencias, errores y exportación de reconteos." },
  { id: "INVENTORY_MOVEMENTS", label: "Movimientos de inventario", description: "Motivos, lotes y aprobaciones." },
  { id: "WAREHOUSE_MOVEMENTS", label: "Movimientos de almacén", description: "Crear, aprobar, recibir, editar y cancelar movimientos de bodega." },
  { id: "PAYMENT_METHODS", label: "Métodos de pago", description: "Alta, baja y edición de métodos." },
  { id: "CUSTOMER_FIELDS", label: "Configuración de clientes", description: "Campos obligatorios y procedencias." },
  { id: "DEALS", label: "Deals", description: "Configuración y publicación de paquetes." },
  { id: "COMPETITIONS", label: "Competiciones", description: "Tipos, periodos y objetivos." },
  { id: "REPORTS_COSTS", label: "Reportes y costos", description: "Costos, utilidad y reportes administrativos." },
  { id: "BRANCHES", label: "Sucursales", description: "Alta, activación e inactivación." },
  { id: "USERS_ROLES", label: "Usuarios y roles", description: "Asignaciones y permisos del personal." },
];

const cloneRole = (role: EmployeeRole): EmployeeRole => ({
  ...role,
  moduleAccess: [...role.moduleAccess],
  moduleEditAccess: [...role.moduleEditAccess],
  configurationAccess: [...role.configurationAccess],
});

export function EmployeesView({
  authorized,
  roles,
  sellers,
  onAuthorize,
  onLock,
  onSaveRole,
  onSaveSeller,
  onToggleRole,
  onAssignRole,
  onSetMasterAccess,
}: EmployeesViewProps) {
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState(
    roles.find((role) => !role.system)?.id ?? roles[0]?.id ?? "",
  );
  const selectedRole =
    roles.find((role) => role.id === selectedRoleId) ?? roles[0];
  const [roleDraft, setRoleDraft] = useState<EmployeeRole | null>(
    selectedRole ? cloneRole(selectedRole) : null,
  );
  const [newRoleOpen, setNewRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [selectedMasterSellerIds, setSelectedMasterSellerIds] = useState<string[]>([]);
  const [newMasterCode, setNewMasterCode] = useState("");
  const [sellerDraft, setSellerDraft] = useState<Seller | null>(null);

  useEffect(() => {
    if (selectedRole) setRoleDraft(cloneRole(selectedRole));
  }, [selectedRole]);

  const activeRoles = roles.filter((role) => role.active);
  const activeSellers = sellers.filter((seller) => seller.active);
  const masterSellers = activeSellers.filter((seller) => seller.masterAccessCode);
  const assignedByRole = useMemo(
    () =>
      sellers.reduce<Record<string, number>>((summary, seller) => {
        summary[seller.roleId] = (summary[seller.roleId] ?? 0) + 1;
        return summary;
      }, {}),
    [sellers],
  );

  const authorize = () => {
    if (!onAuthorize(accessCode.trim())) {
      setAccessError("Código master incorrecto.");
      return;
    }
    setAccessCode("");
    setAccessError("");
    toast.success("Employees desbloqueado para Master Keysar.");
  };

  const toggleMasterSeller = (sellerId: string) => {
    setSelectedMasterSellerIds((current) =>
      current.includes(sellerId)
        ? current.filter((id) => id !== sellerId)
        : [...current, sellerId],
    );
  };

  const assignMasterCode = () => {
    if (selectedMasterSellerIds.length === 0) {
      toast.error("Selecciona por lo menos un empleado activo.");
      return;
    }
    if (newMasterCode.length !== 4) {
      toast.error("El código master debe contener exactamente 4 dígitos.");
      return;
    }
    if (!onSetMasterAccess(selectedMasterSellerIds, newMasterCode)) return;
    toast.success(
      `Código master asignado a ${selectedMasterSellerIds.length} empleado${selectedMasterSellerIds.length === 1 ? "" : "s"}.`,
    );
    setNewMasterCode("");
    setSelectedMasterSellerIds([]);
  };

  const revokeMasterCode = () => {
    if (selectedMasterSellerIds.length === 0) {
      toast.error("Selecciona los empleados cuyo acceso deseas revocar.");
      return;
    }
    if (!onSetMasterAccess(selectedMasterSellerIds, null)) return;
    toast.success("Acceso master revocado para la selección.");
    setSelectedMasterSellerIds([]);
    setNewMasterCode("");
  };

  if (!authorized) {
    return (
      <Card className="my-account-gate employee-access-gate">
        <CardContent>
          <div className="my-account-gate-icon">
            <UsersRound size={27} />
          </div>
          <span className="section-kicker">ACCESO MASTER EXCLUSIVO</span>
          <h2>Employees</h2>
          <p>
            El personal, los puestos y los permisos por módulo sólo pueden ser
            administrados por el usuario master.
          </p>
          <div className="my-account-code-row">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={accessCode}
              onChange={(event) =>
                setAccessCode(event.target.value.replace(/\D/g, ""))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") authorize();
              }}
              placeholder="Código master"
              aria-label="Código master para Employees"
            />
            <Button
              type="button"
              onClick={authorize}
              disabled={accessCode.length !== 4}
            >
              <ShieldCheck size={16} /> Acceder
            </Button>
          </div>
          {accessError && <span className="my-account-error">{accessError}</span>}
          <small>Usuario de prueba: {masterUser.name} · código 2468.</small>
        </CardContent>
      </Card>
    );
  }

  const toggleModule = (screen: ScreenId) => {
    if (!roleDraft || roleDraft.system) return;
    setRoleDraft((current) => {
      if (!current) return current;
      const selected = current.moduleAccess.includes(screen);
      return {
        ...current,
        moduleAccess: selected
          ? current.moduleAccess.filter((item) => item !== screen)
          : [...current.moduleAccess, screen],
        moduleEditAccess: selected
          ? current.moduleEditAccess.filter((item) => item !== screen)
          : current.moduleEditAccess,
      };
    });
  };

  const toggleModuleEdit = (screen: ScreenId) => {
    if (!roleDraft || roleDraft.system) return;
    setRoleDraft((current) => {
      if (!current) return current;
      const selected = current.moduleEditAccess.includes(screen);
      return {
        ...current,
        moduleAccess:
          !selected && !current.moduleAccess.includes(screen)
            ? [...current.moduleAccess, screen]
            : current.moduleAccess,
        moduleEditAccess: selected
          ? current.moduleEditAccess.filter((item) => item !== screen)
          : [...current.moduleEditAccess, screen],
      };
    });
  };

  const toggleConfiguration = (permission: EmployeeConfigurationPermission) => {
    if (!roleDraft || roleDraft.system) return;
    setRoleDraft((current) => {
      if (!current) return current;
      const selected = current.configurationAccess.includes(permission);
      return {
        ...current,
        moduleAccess:
          !selected && !current.moduleAccess.includes("settings")
            ? [...current.moduleAccess, "settings"]
            : current.moduleAccess,
        configurationAccess: selected
          ? current.configurationAccess.filter((item) => item !== permission)
          : [...current.configurationAccess, permission],
      };
    });
  };

  const saveRole = () => {
    if (!roleDraft) return;
    if (!roleDraft.name.trim()) {
      toast.error("Captura el nombre del puesto o rol.");
      return;
    }
    if (roleDraft.moduleAccess.length === 0) {
      toast.error("El rol debe conservar acceso por lo menos a un módulo.");
      return;
    }
    const normalizedModuleAccess =
      roleDraft.configurationAccess.length > 0 &&
      !roleDraft.moduleAccess.includes("settings")
        ? [...roleDraft.moduleAccess, "settings" as const]
        : roleDraft.moduleAccess;
    const normalizedModuleEditAccess = roleDraft.moduleEditAccess.filter((screen) =>
      normalizedModuleAccess.includes(screen),
    );
    onSaveRole({
      ...roleDraft,
      name: roleDraft.name.trim(),
      description: roleDraft.description.trim(),
      moduleAccess: normalizedModuleAccess,
      moduleEditAccess: normalizedModuleEditAccess,
    });
    toast.success(`Permisos de ${roleDraft.name} actualizados.`);
  };

  const createRole = () => {
    const name = newRoleName.trim();
    if (!name) {
      toast.error("Captura el nombre del nuevo rol.");
      return;
    }
    if (
      roles.some(
        (role) =>
          role.name.toLocaleLowerCase("es-MX") ===
          name.toLocaleLowerCase("es-MX"),
      )
    ) {
      toast.error("Ya existe un rol con ese nombre.");
      return;
    }
    const role: EmployeeRole = {
      id: `role-${crypto.randomUUID()}`,
      name,
      description: newRoleDescription.trim() || "Rol personalizado de la empresa.",
      active: true,
      system: false,
      moduleAccess: ["sale", "clock-in"],
      moduleEditAccess: ["sale", "clock-in"],
      configurationAccess: [],
    };
    onSaveRole(role);
    setSelectedRoleId(role.id);
    setNewRoleName("");
    setNewRoleDescription("");
    setNewRoleOpen(false);
    toast.success(`${name} registrado. Configura ahora sus accesos.`);
  };

  const openNewSeller = () => {
    const defaultRole =
      roles.find((role) => role.id === "role-seller" && role.active) ??
      roles.find((role) => role.active && !role.system);
    if (!defaultRole) {
      toast.error("Primero registra o activa un rol para el vendedor.");
      return;
    }
    setSellerDraft({
      id: `seller-${crypto.randomUUID()}`,
      name: "",
      alias: "",
      initials: "",
      active: true,
      accessCode: "",
      masterAccessCode: null,
      canViewCosts: defaultRole.configurationAccess.includes("REPORTS_COSTS"),
      roleId: defaultRole.id,
    });
  };

  const saveSeller = () => {
    if (!sellerDraft) return;
    const editing = sellers.some((seller) => seller.id === sellerDraft.id);
    if (!onSaveSeller(sellerDraft)) return;
    toast.success(
      editing
        ? `${sellerDraft.name.trim()} actualizado.`
        : `${sellerDraft.name.trim()} registrado. Ya puede ingresar con el alias ${sellerDraft.alias.trim().toLocaleLowerCase("es-MX")}.`,
    );
    setSellerDraft(null);
  };

  return (
    <div className="employees-admin-view view-stack">
      <div className="employees-admin-heading">
        <div>
          <span className="section-kicker">CONTROL DE ACCESO · MASTER</span>
          <h2>Empleados, puestos y permisos</h2>
          <p>Define exactamente qué puede consultar o configurar cada rol.</p>
        </div>
        <div>
          <Button type="button" variant="outline" onClick={onLock}>
            <LockKeyhole size={15} /> Bloquear módulo
          </Button>
          <Button type="button" variant="outline" onClick={openNewSeller}>
            <Plus size={15} /> Registrar vendedor
          </Button>
          <Button type="button" onClick={() => setNewRoleOpen(true)}>
            <Plus size={15} /> Registrar rol
          </Button>
        </div>
      </div>

      <div className="employee-role-metrics">
        <Card><CardContent><BriefcaseBusiness size={19} /><span>ROLES ACTIVOS</span><strong>{activeRoles.length}</strong></CardContent></Card>
        <Card><CardContent><UsersRound size={19} /><span>EMPLEADOS</span><strong>{sellers.length}</strong></CardContent></Card>
        <Card><CardContent><BadgeCheck size={19} /><span>PERSONAL ACTIVO</span><strong>{sellers.filter((seller) => seller.active).length}</strong></CardContent></Card>
        <Card><CardContent><SlidersHorizontal size={19} /><span>PERMISOS CONFIGURABLES</span><strong>{configurationOptions.length}</strong></CardContent></Card>
        <Card><CardContent><ShieldCheck size={19} /><span>ACCESOS MASTER</span><strong>{masterSellers.length}</strong></CardContent></Card>
      </div>

      <div className="employee-role-layout">
        <Card className="employee-role-list-card">
          <CardContent>
            <div className="employee-role-section-heading">
              <span>ROLES Y PUESTOS</span>
              <Badge variant="outline">{roles.length}</Badge>
            </div>
            <div className="employee-role-list">
              {roles.map((role) => (
                <button
                  type="button"
                  key={role.id}
                  className={selectedRole?.id === role.id ? "is-selected" : ""}
                  onClick={() => setSelectedRoleId(role.id)}
                >
                  <span><UserCog size={17} /></span>
                  <span>
                    <strong>{role.name}</strong>
                    <small>{assignedByRole[role.id] ?? 0} empleados · {role.moduleAccess.length} módulos</small>
                  </span>
                  <Badge variant={role.active ? "default" : "outline"}>
                    {role.active ? "ACTIVO" : "INACTIVO"}
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="employee-role-editor-card">
          <CardContent>
            {roleDraft && (
              <>
                <div className="employee-role-editor-heading">
                  <div>
                    <span>{roleDraft.system ? "ROL DE SISTEMA" : "ROL PERSONALIZABLE"}</span>
                    <h2>{roleDraft.name}</h2>
                    <p>{roleDraft.description}</p>
                  </div>
                  <div>
                    {!roleDraft.system && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onToggleRole(roleDraft.id)}
                      >
                        <Power size={15} /> {roleDraft.active ? "Inactivar" : "Activar"}
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={saveRole}
                      disabled={roleDraft.system}
                    >
                      <Check size={15} /> Guardar permisos
                    </Button>
                  </div>
                </div>

                {!roleDraft.system && (
                  <div className="employee-role-name-fields">
                    <div className="field-stack">
                      <Label>Nombre del puesto o rol</Label>
                      <Input
                        value={roleDraft.name}
                        onChange={(event) =>
                          setRoleDraft((current) =>
                            current ? { ...current, name: event.target.value } : current,
                          )
                        }
                      />
                    </div>
                    <div className="field-stack">
                      <Label>Descripción</Label>
                      <Input
                        value={roleDraft.description}
                        onChange={(event) =>
                          setRoleDraft((current) =>
                            current ? { ...current, description: event.target.value } : current,
                          )
                        }
                      />
                    </div>
                  </div>
                )}

                <div className="employee-permission-section">
                  <div>
                    <span>ACCESO A MÓDULOS</span>
                    <strong>{roleDraft.moduleAccess.length} seleccionados</strong>
                  </div>
                  <div className="employee-permission-grid">
                    {moduleOptions.map((module) => {
                      const selected = roleDraft.moduleAccess.includes(module.id);
                      const canEdit = roleDraft.moduleEditAccess.includes(module.id);
                      const locked = Boolean(module.masterOnly) && !roleDraft.system;
                      return (
                        <article
                          key={module.id}
                          className={`employee-module-permission ${selected ? "is-selected" : ""}`}
                        >
                          <button
                            type="button"
                            className="employee-module-access"
                            disabled={roleDraft.system || locked}
                            onClick={() => toggleModule(module.id)}
                          >
                            <span>{selected ? <Check size={14} /> : <KeyRound size={14} />}</span>
                            <span><strong>{module.label}</strong><small>{module.description}</small></span>
                            {locked && <LockKeyhole size={13} />}
                          </button>
                          <div className="employee-module-edit-control">
                            <span>{canEdit ? "EDICIÓN" : "SOLO CONSULTA"}</span>
                            <button
                              type="button"
                              role="switch"
                              aria-label={`Permitir edición en ${module.label}`}
                              aria-checked={canEdit}
                              className={`mock-switch ${canEdit ? "is-on" : ""}`}
                              disabled={roleDraft.system || locked || !selected}
                              onClick={() => toggleModuleEdit(module.id)}
                            >
                              <i />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>

                <div className="employee-permission-section is-configuration">
                  <div>
                    <span>PERMISOS DE CONFIGURACIÓN</span>
                    <strong>{roleDraft.configurationAccess.length} seleccionados</strong>
                  </div>
                  <div className="employee-permission-grid">
                    {configurationOptions.map((permission) => {
                      const selected = roleDraft.configurationAccess.includes(permission.id);
                      return (
                        <button
                          type="button"
                          key={permission.id}
                          className={selected ? "is-selected" : ""}
                          disabled={roleDraft.system}
                          onClick={() => toggleConfiguration(permission.id)}
                        >
                          <span>{selected ? <Check size={14} /> : <PencilLine size={14} />}</span>
                          <span><strong>{permission.label}</strong><small>{permission.description}</small></span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="employee-master-access-card">
        <CardContent>
          <div className="employee-role-editor-heading">
            <div>
              <span>CÓDIGOS MASTER DELEGADOS</span>
              <h2>Asignar acceso master</h2>
              <p>Selecciona uno o varios empleados. El código asignado autoriza los módulos y acciones protegidas durante esta sesión.</p>
            </div>
            <Badge variant="outline"><KeyRound size={13} /> {masterSellers.length} AUTORIZADOS</Badge>
          </div>

          <div className="employee-master-selector">
            <div className="employee-master-toolbar">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setSelectedMasterSellerIds(
                    selectedMasterSellerIds.length === activeSellers.length
                      ? []
                      : activeSellers.map((seller) => seller.id),
                  )
                }
              >
                <UsersRound size={15} />
                {selectedMasterSellerIds.length === activeSellers.length
                  ? "Limpiar selección"
                  : "Seleccionar todos"}
              </Button>
              <span>{selectedMasterSellerIds.length} seleccionados</span>
            </div>
            <div className="employee-master-people">
              {sellers.map((seller) => {
                const selected = selectedMasterSellerIds.includes(seller.id);
                const hasMasterAccess = Boolean(seller.masterAccessCode);
                return (
                  <button
                    type="button"
                    key={seller.id}
                    className={`${selected ? "is-selected" : ""} ${hasMasterAccess ? "has-master" : ""}`}
                    disabled={!seller.active}
                    onClick={() => toggleMasterSeller(seller.id)}
                  >
                    <span>{selected ? <Check size={14} /> : seller.initials}</span>
                    <span><strong>{seller.name}</strong><small>{seller.active ? (hasMasterAccess ? "Código master asignado" : "Sin acceso master") : "Empleado de baja"}</small></span>
                    {hasMasterAccess && <Badge>MASTER</Badge>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="employee-master-code-row">
            <div className="field-stack">
              <Label htmlFor="employee-master-code">Nuevo código master</Label>
              <Input
                id="employee-master-code"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newMasterCode}
                onChange={(event) => setNewMasterCode(event.target.value.replace(/\D/g, ""))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") assignMasterCode();
                }}
                placeholder="4 dígitos"
              />
              <small>El código queda oculto y puede compartirse con todos los empleados seleccionados.</small>
            </div>
            <Button type="button" variant="outline" onClick={revokeMasterCode} disabled={selectedMasterSellerIds.length === 0}>
              <LockKeyhole size={15} /> Revocar seleccionados
            </Button>
            <Button type="button" onClick={assignMasterCode} disabled={selectedMasterSellerIds.length === 0 || newMasterCode.length !== 4}>
              <ShieldCheck size={15} /> Asignar código master
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="employee-assignment-card">
        <CardContent>
          <div className="employee-role-editor-heading">
            <div>
              <span>ASIGNACIÓN DEL PERSONAL</span>
              <h2>Rol vigente por empleado</h2>
              <p>Cambiar un puesto actualiza inmediatamente los permisos de ese empleado.</p>
            </div>
            <Badge><ShieldCheck size={13} /> MASTER KEYSAR</Badge>
          </div>
          <div className="employee-assignment-list">
            {sellers.map((seller) => {
              const assignedRole = roles.find((role) => role.id === seller.roleId);
              return (
                <article key={seller.id} className={!seller.active ? "is-inactive" : ""}>
                  <span className="employee-assignment-avatar">{seller.initials}</span>
                  <span>
                    <strong>{seller.name}</strong>
                    <small>Alias: {seller.alias} · Código personal •••• · {seller.active ? "Activo" : "Baja"}</small>
                  </span>
                  <Select
                    value={seller.roleId}
                    onValueChange={(roleId) => onAssignRole(seller.id, roleId)}
                    disabled={!seller.active}
                  >
                    <SelectTrigger aria-label={`Rol de ${seller.name}`}>
                      <SelectValue placeholder="Selecciona rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles
                        .filter((role) => role.active && !role.system)
                        .map((role) => (
                          <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="outline">
                    {assignedRole?.moduleAccess.length ?? 0} MÓDULOS
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="employee-edit-button"
                    aria-label={`Editar ${seller.name}`}
                    onClick={() => setSellerDraft({ ...seller })}
                  >
                    <PencilLine size={15} />
                  </Button>
                </article>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(sellerDraft)} onOpenChange={(open) => !open && setSellerDraft(null)}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>
              {sellerDraft && sellers.some((seller) => seller.id === sellerDraft.id)
                ? "Editar vendedor"
                : "Registrar nuevo vendedor"}
            </DialogTitle>
            <DialogDescription>
              El nombre se mostrará en tickets, ventas y reportes. El alias será el usuario corto para ingresar al sistema.
            </DialogDescription>
          </DialogHeader>
          {sellerDraft && (
            <div className="employee-new-seller-fields">
              <div className="field-stack">
                <Label htmlFor="employee-ticket-name">Nombre para ticket</Label>
                <Input
                  id="employee-ticket-name"
                  value={sellerDraft.name}
                  onChange={(event) => setSellerDraft((current) => current ? { ...current, name: event.target.value } : current)}
                  placeholder="Ej. Ana Torres"
                  autoComplete="name"
                />
                <small>Este nombre será visible para el cliente y en todos los reportes.</small>
              </div>
              <div className="field-stack">
                <Label htmlFor="employee-login-alias">Alias de acceso</Label>
                <Input
                  id="employee-login-alias"
                  value={sellerDraft.alias}
                  onChange={(event) => setSellerDraft((current) => current ? { ...current, alias: event.target.value.toLocaleLowerCase("es-MX").replace(/\s+/g, "") } : current)}
                  placeholder="Ej. ana"
                  autoComplete="username"
                />
                <small>Único, de 3 a 24 caracteres y sin espacios.</small>
              </div>
              <div className="field-stack">
                <Label htmlFor="employee-personal-code">Código personal</Label>
                <Input
                  id="employee-personal-code"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={sellerDraft.accessCode}
                  onChange={(event) => setSellerDraft((current) => current ? { ...current, accessCode: event.target.value.replace(/\D/g, "") } : current)}
                  placeholder="4 dígitos"
                  autoComplete="new-password"
                />
              </div>
              <div className="field-stack">
                <Label>Rol o puesto</Label>
                <Select value={sellerDraft.roleId} onValueChange={(roleId) => setSellerDraft((current) => current ? { ...current, roleId } : current)}>
                  <SelectTrigger><SelectValue placeholder="Selecciona rol" /></SelectTrigger>
                  <SelectContent>
                    {roles.filter((role) => role.active && !role.system).map((role) => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="field-stack">
                <Label>Estado del vendedor</Label>
                <Select value={sellerDraft.active ? "ACTIVE" : "INACTIVE"} onValueChange={(value) => setSellerDraft((current) => current ? { ...current, active: value === "ACTIVE" } : current)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Activo</SelectItem>
                    <SelectItem value="INACTIVE">Baja / inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSellerDraft(null)}>Cancelar</Button>
            <Button
              type="button"
              onClick={saveSeller}
              disabled={
                !sellerDraft ||
                !sellerDraft.name.trim() ||
                !sellerDraft.alias.trim() ||
                sellerDraft.accessCode.length !== 4
              }
            >
              <Check size={15} /> Guardar vendedor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newRoleOpen} onOpenChange={setNewRoleOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Registrar nuevo rol o puesto</DialogTitle>
            <DialogDescription>
              El rol inicia con acceso a Sale y Clock In. Después podrás ajustar
              todos sus módulos y configuraciones.
            </DialogDescription>
          </DialogHeader>
          <div className="employee-new-role-fields">
            <div className="field-stack">
              <Label htmlFor="employee-role-name">Nombre del rol</Label>
              <Input
                id="employee-role-name"
                value={newRoleName}
                onChange={(event) => setNewRoleName(event.target.value)}
                placeholder="Ej. Facialista"
              />
            </div>
            <div className="field-stack">
              <Label htmlFor="employee-role-description">Descripción</Label>
              <Input
                id="employee-role-description"
                value={newRoleDescription}
                onChange={(event) => setNewRoleDescription(event.target.value)}
                placeholder="Responsabilidades principales"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNewRoleOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={createRole}><Plus size={15} /> Registrar rol</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
