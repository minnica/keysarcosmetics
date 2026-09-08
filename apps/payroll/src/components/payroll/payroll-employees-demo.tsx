"use client";

import { type FormEvent, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Copy,
  History,
  KeyRound,
  LockKeyhole,
  PencilLine,
  Plus,
  Search,
  ShieldCheck,
  UserCog,
  UserMinus,
  UserRoundCheck,
  UsersRound,
  WalletCards,
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
  toast,
} from "@cosmetics/ui";
import {
  type DemoEmployee,
  type EmployeeCategory,
  type PayrollModule,
  payrollModuleLabel,
  usePayrollDemo,
} from "./payroll-demo-context";
import {
  CostBranchSelector,
  employeeCostBranchIds,
} from "./payroll-cost-branch-selector";

const categoryLabels: Record<EmployeeCategory, string> = {
  SELLER: "Ventas / comisión",
  SPECIALIST: "Especialistas",
  MANAGEMENT: "Gerencia",
  CALL_CENTER: "Call center",
  CONTRACTOR: "Honorarios",
};

const categoryDefaults: Record<
  EmployeeCategory,
  Pick<
    DemoEmployee,
    | "socialCostRate"
    | "isrCostRate"
    | "ivaRate"
    | "isrRetentionRate"
    | "ivaRetentionRate"
  >
> = {
  SELLER: {
    socialCostRate: 0.18,
    isrCostRate: 0.1,
    ivaRate: 0,
    isrRetentionRate: 0,
    ivaRetentionRate: 0,
  },
  SPECIALIST: {
    socialCostRate: 0.22,
    isrCostRate: 0.12,
    ivaRate: 0,
    isrRetentionRate: 0,
    ivaRetentionRate: 0,
  },
  MANAGEMENT: {
    socialCostRate: 0.25,
    isrCostRate: 0.16,
    ivaRate: 0,
    isrRetentionRate: 0,
    ivaRetentionRate: 0,
  },
  CALL_CENTER: {
    socialCostRate: 0.2,
    isrCostRate: 0.1,
    ivaRate: 0,
    isrRetentionRate: 0,
    ivaRetentionRate: 0,
  },
  CONTRACTOR: {
    socialCostRate: 0,
    isrCostRate: 0,
    ivaRate: 0.16,
    isrRetentionRate: 0.1,
    ivaRetentionRate: 0.106667,
  },
};

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const CLABE_LENGTH = 18;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function normalizeCredentialPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/gi, "")
    .toLocaleUpperCase("es-MX");
}

function createTemporaryPassword() {
  const values = new Uint32Array(2);
  globalThis.crypto.getRandomValues(values);
  return `KS-${values[0]!.toString(36).toUpperCase().padStart(4, "0").slice(-4)}-${values[1]!.toString(36).toUpperCase().padStart(4, "0").slice(-4)}`;
}

function EmployeeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, addEmployee } = usePayrollDemo();
  const initialPosition =
    state.positions.find((item) => item.active) ?? state.positions[0];
  const [name, setName] = useState("");
  const [position, setPosition] = useState(initialPosition?.name ?? "");
  const [category, setCategory] = useState<EmployeeCategory>(
    initialPosition?.category ?? "SELLER",
  );
  const [branchId, setBranchId] = useState(state.branches[0]?.id ?? "");
  const [costBranchIds, setCostBranchIds] = useState<string[]>(
    [state.branches[0]?.id ?? ""].filter(Boolean),
  );
  const [roleId, setRoleId] = useState(
    initialPosition?.defaultRoleId ?? "role-employee",
  );
  const [monthlySalary, setMonthlySalary] = useState("0");
  const [salaryPayrollModuleId, setSalaryPayrollModuleId] =
    useState<Exclude<PayrollModule, "CONSOLIDATED">>("FIXED");
  const [commissionPayrollModuleId, setCommissionPayrollModuleId] = useState<
    Exclude<PayrollModule, "CONSOLIDATED"> | "NONE"
  >("NONE");
  const [bank, setBank] = useState("");
  const [clabe, setClabe] = useState("");
  const [hireDate, setHireDate] = useState(localDate());
  const [attempted, setAttempted] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    username: string;
    temporaryPassword: string;
  } | null>(null);

  function clearForm() {
    setName("");
    const nextInitialPosition =
      state.positions.find((item) => item.active) ?? state.positions[0];
    setPosition(nextInitialPosition?.name ?? "");
    setCategory(nextInitialPosition?.category ?? "SELLER");
    setBranchId(state.branches[0]?.id ?? "");
    setCostBranchIds([state.branches[0]?.id ?? ""].filter(Boolean));
    setRoleId(nextInitialPosition?.defaultRoleId ?? "role-employee");
    setMonthlySalary("0");
    setSalaryPayrollModuleId("FIXED");
    setCommissionPayrollModuleId("NONE");
    setBank("");
    setClabe("");
    setHireDate(localDate());
    setAttempted(false);
    setGeneratedCredentials(null);
  }

  function createUniqueUsername(fullName: string) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const base = normalizeCredentialPart(
      `${parts[0] ?? "USUARIO"}.${parts.at(-1) ?? "NUEVO"}`,
    );
    let candidate = base;
    let suffix = 2;
    while (
      state.employees.some(
        (employee) =>
          normalizeCredentialPart(employee.username ?? employee.name) ===
          candidate,
      )
    ) {
      candidate = `${base}${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  function selectPosition(positionName: string) {
    const selected = state.positions.find((item) => item.name === positionName);
    if (!selected) return;
    setPosition(selected.name);
    setCategory(selected.category);
    setRoleId(selected.defaultRoleId);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    const salary = Number(monthlySalary);
    const normalizedClabe = clabe.replace(/\D/g, "");
    const lastFour = normalizedClabe.slice(-4);
    if (
      !name.trim() ||
      !position.trim() ||
      !branchId ||
      !costBranchIds.length ||
      !roleId ||
      !hireDate ||
      !bank.trim() ||
      normalizedClabe.length !== CLABE_LENGTH ||
      !Number.isFinite(salary) ||
      salary < 0 ||
      (salary > 0 && !salaryPayrollModuleId)
    ) {
      toast.error(
        "Completa los datos requeridos y captura una CLABE exacta de 18 dígitos.",
      );
      return;
    }

    const username = createUniqueUsername(name);
    const temporaryPassword = createTemporaryPassword();
    addEmployee({
      name: name.trim(),
      username,
      accessPassword: temporaryPassword,
      mustChangeCredentials: true,
      credentialsUpdatedAt: null,
      position: position.trim(),
      category,
      branchId,
      costBranchIds,
      monthlySalary: salary,
      salaryPayrollModuleId: salary > 0 ? salaryPayrollModuleId : null,
      commissionPayrollModuleId:
        commissionPayrollModuleId === "NONE" ? null : commissionPayrollModuleId,
      schemeId: null,
      bank: bank.trim(),
      account: `•••• ${lastFour}`,
      clabe: normalizedClabe,
      roleId,
      active: hireDate <= localDate(),
      hireDate,
      terminationDate: null,
      ...categoryDefaults[category],
      viaticsEnabled: false,
      allowedViaticsConceptIds: [],
      secondaryAccessKey: null,
      secondaryAccessKeyUpdatedAt: null,
      secondaryAccessKeyUpdatedBy: null,
    });
    setGeneratedCredentials({ username, temporaryPassword });
    toast.success(
      `Empleado registrado. Entrega sus credenciales temporales de forma privada.`,
    );
  }

  async function copyCredentials() {
    if (!generatedCredentials) return;
    try {
      await navigator.clipboard.writeText(
        `Usuario: ${generatedCredentials.username}\nContraseña temporal: ${generatedCredentials.temporaryPassword}`,
      );
      toast.success("Credenciales copiadas.");
    } catch {
      toast.error(
        "No se pudo copiar automáticamente. Copia los datos visibles de forma manual.",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) clearForm();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        {generatedCredentials ? (
          <div>
            <DialogHeader>
              <DialogTitle>Acceso temporal generado</DialogTitle>
              <DialogDescription>
                Entrega estos datos únicamente al empleado. En su primer acceso
                deberá crear su contraseña definitiva y código privado.
              </DialogDescription>
            </DialogHeader>
            <div className="my-5 rounded-2xl border border-[#b98b5e]/45 bg-[linear-gradient(145deg,#241d18,#171411)] p-5 text-[#f8eee2] shadow-xl">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d5aa7e]/35 bg-[#d5aa7e]/10">
                  <KeyRound className="h-4 w-4 text-[#e6be94]" />
                </span>
                <div>
                  <p className="text-xs font-semibold">
                    Credencial de primer acceso
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#a99b8f]">
                    Visible una sola vez en este registro
                  </p>
                </div>
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <dt className="text-[9px] uppercase tracking-[0.13em] text-[#cba27c]">
                    Usuario
                  </dt>
                  <dd className="mt-1.5 font-semibold tracking-[0.08em]">
                    {generatedCredentials.username}
                  </dd>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <dt className="text-[9px] uppercase tracking-[0.13em] text-[#cba27c]">
                    Contraseña temporal
                  </dt>
                  <dd className="mt-1.5 font-mono font-semibold tracking-[0.08em]">
                    {generatedCredentials.temporaryPassword}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 flex gap-2 text-[10px] leading-5 text-[#b9ada2]">
                <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d5aa7e]" />
                La contraseña temporal queda invalidada cuando el empleado
                define su nueva contraseña y código de cuatro dígitos.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={copyCredentials}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copiar credenciales
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  clearForm();
                  onOpenChange(false);
                }}
              >
                <BadgeCheck className="mr-1.5 h-3.5 w-3.5" />
                Finalizar alta
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Nuevo empleado</DialogTitle>
              <DialogDescription>
                Alta local de demostración. El registro vive únicamente durante
                esta sesión.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="employee-name">Nombre completo</Label>
                <Input
                  id="employee-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="PERSONA DEMO 10"
                  aria-invalid={attempted && !name.trim()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-position">Puesto</Label>
                <Select value={position} onValueChange={selectPosition}>
                  <SelectTrigger
                    id="employee-position"
                    aria-invalid={attempted && !position}
                  >
                    <SelectValue placeholder="SELECCIONA UN PUESTO" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.positions
                      .filter((item) => item.active)
                      .map((item) => (
                        <SelectItem key={item.id} value={item.name}>
                          {item.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-[color:var(--text-muted)]">
                  Catálogo controlado desde Configuración · Puestos.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-category">Tipo de nómina</Label>
                <Select value={category} disabled>
                  <SelectTrigger
                    id="employee-category"
                    aria-label="Tipo de nómina definido por el puesto"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-branch">Sucursal</Label>
                <Select
                  value={branchId}
                  onValueChange={(nextBranchId) => {
                    setBranchId(nextBranchId);
                    if (costBranchIds.length <= 1)
                      setCostBranchIds([nextBranchId]);
                  }}
                >
                  <SelectTrigger id="employee-branch">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.branches
                      .filter((branch) => branch.active)
                      .map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-role">Rol del puesto</Label>
                <Select value={roleId} onValueChange={setRoleId}>
                  <SelectTrigger id="employee-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Distribución del costo</Label>
                <CostBranchSelector
                  branches={state.branches.filter((branch) => branch.active)}
                  selectedIds={costBranchIds}
                  onChange={setCostBranchIds}
                />
                <p className="text-[10px] leading-4 text-[color:var(--text-muted)]">
                  Elige una, varias o todas. El sueldo base, costo social e ISR
                  se reparten por igual entre los puntos seleccionados.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-salary">Sueldo mensual</Label>
                <Input
                  id="employee-salary"
                  type="number"
                  min="0"
                  step="100"
                  value={monthlySalary}
                  onChange={(event) => setMonthlySalary(event.target.value)}
                />
                <p className="text-[10px] text-[color:var(--text-muted)]">
                  Se divide exclusivamente entre las quincenas 1–15 y 16–fin de
                  mes.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-salary-payroll">
                  Nómina que paga el sueldo
                </Label>
                <Select
                  value={salaryPayrollModuleId}
                  onValueChange={(value) =>
                    setSalaryPayrollModuleId(
                      value as Exclude<PayrollModule, "CONSOLIDATED">,
                    )
                  }
                  disabled={Number(monthlySalary) <= 0}
                >
                  <SelectTrigger id="employee-salary-payroll">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.payrollModules
                      .filter(
                        (module) =>
                          module.active &&
                          module.id !== "CONSOLIDATED" &&
                          module.concepts.includes("SALARY"),
                      )
                      .map((module) => (
                        <SelectItem key={module.id} value={module.id}>
                          {module.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-[color:var(--text-muted)]">
                  El sueldo se suma únicamente en este módulo.
                </p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="employee-commission-payroll">
                  Nómina de comisión
                </Label>
                <Select
                  value={commissionPayrollModuleId}
                  onValueChange={(value) =>
                    setCommissionPayrollModuleId(
                      value as Exclude<PayrollModule, "CONSOLIDATED"> | "NONE",
                    )
                  }
                >
                  <SelectTrigger id="employee-commission-payroll">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">SIN COMISIÓN</SelectItem>
                    {state.payrollModules
                      .filter(
                        (module) =>
                          module.active &&
                          module.id !== "CONSOLIDATED" &&
                          module.concepts.includes("COMMISSION"),
                      )
                      .map((module) => (
                        <SelectItem key={module.id} value={module.id}>
                          {module.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-[color:var(--text-muted)]">
                  Puede combinarse con sueldo; esta nómina nunca tomará el
                  sueldo base.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-hire-date">Vigente desde</Label>
                <Input
                  id="employee-hire-date"
                  type="date"
                  value={hireDate}
                  onChange={(event) => setHireDate(event.target.value)}
                  required
                />
                <p className="text-[10px] text-[color:var(--text-muted)]">
                  No aparecerá en nóminas anteriores a esta fecha.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-bank">Banco</Label>
                <Input
                  id="employee-bank"
                  value={bank}
                  onChange={(event) => setBank(event.target.value)}
                  placeholder="BANCO DEMO"
                  aria-invalid={attempted && !bank.trim()}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="employee-clabe">CLABE interbancaria</Label>
                  <span
                    className={`text-[9px] font-semibold ${attempted && clabe.length !== CLABE_LENGTH ? "text-rose-600" : "text-[color:var(--text-muted)]"}`}
                  >
                    {clabe.length}/{CLABE_LENGTH}
                  </span>
                </div>
                <Input
                  id="employee-clabe"
                  name="employee-clabe"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={CLABE_LENGTH}
                  pattern="[0-9]{18}"
                  required
                  value={clabe}
                  onChange={(event) =>
                    setClabe(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, CLABE_LENGTH),
                    )
                  }
                  placeholder="18 DÍGITOS"
                  aria-invalid={attempted && clabe.length !== CLABE_LENGTH}
                />
                <p className="text-[10px] text-[color:var(--text-muted)]">
                  Debe contener exactamente 18 números. La vista del directorio
                  mostrará solo los últimos cuatro.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-[#c3a583]/35 bg-[#c3a583]/10 px-3 py-2.5 sm:col-span-2">
                <History className="mt-0.5 h-4 w-4 shrink-0 text-[#987049]" />
                <div>
                  <p className="text-xs font-semibold">
                    Historial protegido por fecha
                  </p>
                  <p className="mt-0.5 text-[10px] leading-4 text-[color:var(--text-muted)]">
                    La fecha de alta define la primera nómina posible. Para
                    incluir una nómina anterior debes elegir expresamente una
                    fecha dentro de ese periodo.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm">
                <UserRoundCheck className="mr-1.5 h-3.5 w-3.5" />
                Registrar empleado
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EmploymentDialog({
  employee,
  onOpenChange,
}: {
  employee: DemoEmployee | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateEmployeeEmployment } = usePayrollDemo();
  const [hireDate, setHireDate] = useState(employee?.hireDate ?? localDate());
  const [terminationDate, setTerminationDate] = useState(
    employee?.terminationDate ?? "",
  );

  if (!employee) return null;
  const employeeId = employee.id;

  function save() {
    if (!hireDate || (terminationDate && terminationDate < hireDate)) {
      toast.error("La fecha de baja no puede ser anterior a la fecha de alta.");
      return;
    }
    updateEmployeeEmployment(employeeId, hireDate, terminationDate || null);
    toast.success(
      terminationDate
        ? `Baja registrada al ${terminationDate}; la última quincena se prorrateará.`
        : "Vigencia laboral actualizada.",
    );
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vigencia laboral</DialogTitle>
          <DialogDescription>
            {employee.name} · conserva intactas las nóminas fuera del rango
            seleccionado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employment-start">Fecha de alta</Label>
              <Input
                id="employment-start"
                type="date"
                value={hireDate}
                onChange={(event) => setHireDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employment-end">Fecha de baja</Label>
              <Input
                id="employment-end"
                type="date"
                min={hireDate}
                value={terminationDate}
                onChange={(event) => setTerminationDate(event.target.value)}
              />
            </div>
          </div>
          <div className="rounded-xl border border-[#c3a583]/35 bg-[#c3a583]/10 p-3">
            <div className="flex gap-3">
              <UserMinus className="mt-0.5 h-4 w-4 shrink-0 text-[#987049]" />
              <div>
                <p className="text-xs font-semibold">
                  La fecha de baja es inclusiva
                </p>
                <p className="mt-1 text-[11px] leading-5 text-[color:var(--text-muted)]">
                  Si cae dentro de una quincena, el empleado permanece en esa
                  nómina y el sueldo se calcula únicamente por los días
                  trabajados. Los recibos anteriores no se eliminan.
                </p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button size="sm" onClick={save}>
            <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
            Guardar vigencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmployeeProfileDialog({
  employee,
  onOpenChange,
}: {
  employee: DemoEmployee | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, updateEmployeeProfile } = usePayrollDemo();
  const [name, setName] = useState(employee?.name ?? "");
  const [position, setPosition] = useState(employee?.position ?? "");
  const [category, setCategory] = useState<EmployeeCategory>(
    employee?.category ?? "SELLER",
  );
  const [branchId, setBranchId] = useState(
    employee?.branchId ?? state.branches[0]?.id ?? "",
  );
  const [costBranchIds, setCostBranchIds] = useState<string[]>(
    employee
      ? employeeCostBranchIds(employee, state.branches)
      : [state.branches[0]?.id ?? ""].filter(Boolean),
  );
  const [roleId, setRoleId] = useState(employee?.roleId ?? "role-employee");
  const [monthlySalary, setMonthlySalary] = useState(
    String(employee?.monthlySalary ?? 0),
  );
  const [salaryPayrollModuleId, setSalaryPayrollModuleId] = useState<
    Exclude<PayrollModule, "CONSOLIDATED">
  >(employee?.salaryPayrollModuleId ?? "FIXED");
  const [commissionPayrollModuleId, setCommissionPayrollModuleId] = useState<
    Exclude<PayrollModule, "CONSOLIDATED"> | "NONE"
  >(employee?.commissionPayrollModuleId ?? "NONE");
  const [bank, setBank] = useState(employee?.bank ?? "");
  const [clabe, setClabe] = useState(employee?.clabe ?? "");
  const [attempted, setAttempted] = useState(false);

  if (!employee) return null;
  const employeeId = employee.id;

  function changePosition(positionName: string) {
    const selected = state.positions.find((item) => item.name === positionName);
    if (!selected) return;
    setPosition(selected.name);
    setCategory(selected.category);
    setRoleId(selected.defaultRoleId);
  }

  function save() {
    setAttempted(true);
    const salary = Number(monthlySalary);
    const normalizedClabe = clabe.replace(/\D/g, "");
    if (
      !name.trim() ||
      !position.trim() ||
      !branchId ||
      !costBranchIds.length ||
      !roleId ||
      !bank.trim() ||
      normalizedClabe.length !== CLABE_LENGTH ||
      !Number.isFinite(salary) ||
      salary < 0
    ) {
      toast.error(
        "Completa el perfil, el banco y una CLABE exacta de 18 dígitos.",
      );
      return;
    }
    updateEmployeeProfile(employeeId, {
      name: name.trim(),
      position: position.trim(),
      category,
      branchId,
      costBranchIds,
      roleId,
      monthlySalary: salary,
      salaryPayrollModuleId: salary > 0 ? salaryPayrollModuleId : null,
      commissionPayrollModuleId:
        commissionPayrollModuleId === "NONE" ? null : commissionPayrollModuleId,
      bank: bank.trim(),
      account: `•••• ${normalizedClabe.slice(-4)}`,
      clabe: normalizedClabe,
      ...categoryDefaults[category],
    });
    toast.success(
      category === "SELLER"
        ? "Perfil actualizado a Ventas; portal y permisos sincronizados."
        : "Perfil y accesos actualizados.",
    );
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar perfil y acceso</DialogTitle>
          <DialogDescription>
            Los cambios se reflejan inmediatamente en su portal, nómina y
            permisos de la demostración.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="profile-name">Nombre</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-position">Puesto</Label>
            <Select value={position} onValueChange={changePosition}>
              <SelectTrigger id="profile-position">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {state.positions
                  .filter(
                    (item) => item.active || item.name === employee.position,
                  )
                  .map((item) => (
                    <SelectItem key={item.id} value={item.name}>
                      {item.name}
                      {item.active ? "" : " · INACTIVO"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-[color:var(--text-muted)]">
              Solo puestos autorizados en el catálogo.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-category">Área de nómina</Label>
            <Select value={category} disabled>
              <SelectTrigger
                id="profile-category"
                aria-label="Área de nómina definida por el puesto"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-branch">Sucursal principal</Label>
            <Select
              value={branchId}
              onValueChange={(nextBranchId) => {
                setBranchId(nextBranchId);
                if (costBranchIds.length <= 1) setCostBranchIds([nextBranchId]);
              }}
            >
              <SelectTrigger id="profile-branch">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {state.branches
                  .filter(
                    (branch) =>
                      branch.active || branch.id === employee.branchId,
                  )
                  .map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                      {branch.active ? "" : " · BAJA"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-role">Rol de acceso</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger id="profile-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {state.roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-salary">Sueldo mensual</Label>
            <Input
              id="profile-salary"
              type="number"
              min="0"
              step="100"
              value={monthlySalary}
              onChange={(event) => setMonthlySalary(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-salary-payroll">
              Nómina que paga el sueldo
            </Label>
            <Select
              value={salaryPayrollModuleId}
              onValueChange={(value) =>
                setSalaryPayrollModuleId(
                  value as Exclude<PayrollModule, "CONSOLIDATED">,
                )
              }
              disabled={Number(monthlySalary) <= 0}
            >
              <SelectTrigger id="profile-salary-payroll">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {state.payrollModules
                  .filter(
                    (module) =>
                      module.active &&
                      module.id !== "CONSOLIDATED" &&
                      module.concepts.includes("SALARY"),
                  )
                  .map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="profile-commission-payroll">
              Nómina que paga la comisión
            </Label>
            <Select
              value={commissionPayrollModuleId}
              onValueChange={(value) =>
                setCommissionPayrollModuleId(
                  value as Exclude<PayrollModule, "CONSOLIDATED"> | "NONE",
                )
              }
            >
              <SelectTrigger id="profile-commission-payroll">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">SIN COMISIÓN</SelectItem>
                {state.payrollModules
                  .filter(
                    (module) =>
                      module.active &&
                      module.id !== "CONSOLIDATED" &&
                      module.concepts.includes("COMMISSION"),
                  )
                  .map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {payrollModuleLabel(state, module.id)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-[color:var(--text-muted)]">
              Sueldo y comisión pueden ir a módulos distintos sin duplicarse.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-bank">Banco</Label>
            <Input
              id="profile-bank"
              value={bank}
              onChange={(event) => setBank(event.target.value)}
              aria-invalid={attempted && !bank.trim()}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="profile-clabe">CLABE interbancaria</Label>
              <span
                className={`text-[9px] font-semibold ${attempted && clabe.length !== CLABE_LENGTH ? "text-rose-600" : "text-[color:var(--text-muted)]"}`}
              >
                {clabe.length}/{CLABE_LENGTH}
              </span>
            </div>
            <Input
              id="profile-clabe"
              name="profile-clabe"
              inputMode="numeric"
              autoComplete="off"
              maxLength={CLABE_LENGTH}
              pattern="[0-9]{18}"
              required
              value={clabe}
              onChange={(event) =>
                setClabe(
                  event.target.value.replace(/\D/g, "").slice(0, CLABE_LENGTH),
                )
              }
              aria-invalid={attempted && clabe.length !== CLABE_LENGTH}
            />
            <p className="text-[10px] text-[color:var(--text-muted)]">
              Exactamente 18 números; no admite letras ni dígitos adicionales.
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Distribución del costo</Label>
            <CostBranchSelector
              branches={state.branches.filter(
                (branch) => branch.active || costBranchIds.includes(branch.id),
              )}
              selectedIds={costBranchIds}
              onChange={setCostBranchIds}
            />
            <p className="text-[10px] leading-4 text-[color:var(--text-muted)]">
              Una sucursal absorbe 100%; varias comparten sueldo, costo social e
              ISR en partes iguales.
            </p>
          </div>
          <div className="flex gap-3 rounded-xl border border-[#c3a583]/35 bg-[#c3a583]/10 p-3 sm:col-span-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#987049]" />
            <div>
              <p className="text-xs font-semibold">Permisos sincronizados</p>
              <p className="mt-1 text-[10px] leading-4 text-[color:var(--text-muted)]">
                Si una gerencia pasa a Ventas, deja de ver recibos gerenciales y
                adopta el rol seleccionado. Su historial como gerente permanece
                en los esquemas de sucursal.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button size="sm" onClick={save}>
            <UserCog className="mr-1.5 h-3.5 w-3.5" />
            Guardar perfil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PayrollEmployeesDemo() {
  const { state } = usePayrollDemo();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [employmentEmployee, setEmploymentEmployee] =
    useState<DemoEmployee | null>(null);
  const [profileEmployee, setProfileEmployee] = useState<DemoEmployee | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState("20");
  const [page, setPage] = useState(1);
  const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");
  const filteredEmployees = useMemo(
    () =>
      state.employees.filter((employee) => {
        const branch = state.branches.find(
          (item) => item.id === employee.branchId,
        );
        const role = state.roles.find((item) => item.id === employee.roleId);
        return (
          !normalizedSearch ||
          `${employee.name} ${employee.position} ${categoryLabels[employee.category]} ${branch?.name ?? ""} ${role?.name ?? ""}`
            .toLocaleLowerCase("es-MX")
            .includes(normalizedSearch)
        );
      }),
    [normalizedSearch, state.branches, state.employees, state.roles],
  );
  const effectivePageSize =
    pageSize === "ALL"
      ? Math.max(filteredEmployees.length, 1)
      : Number(pageSize);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredEmployees.length / effectivePageSize),
  );
  const currentPage = Math.min(page, totalPages);
  const pagedEmployees = filteredEmployees.slice(
    (currentPage - 1) * effectivePageSize,
    currentPage * effectivePageSize,
  );
  const visibleStart =
    filteredEmployees.length === 0
      ? 0
      : (currentPage - 1) * effectivePageSize + 1;
  const visibleEnd = Math.min(
    currentPage * effectivePageSize,
    filteredEmployees.length,
  );
  const activeEmployees = state.employees.filter(
    (employee) => employee.active,
  ).length;
  const branchesCovered = new Set(
    state.employees
      .filter((employee) => employee.active)
      .map((employee) => employee.branchId),
  ).size;
  const monthlyFixedCost = state.employees
    .filter(
      (employee) =>
        employee.active &&
        employee.category !== "SELLER" &&
        employee.category !== "CONTRACTOR",
    )
    .reduce((sum, employee) => sum + employee.monthlySalary, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-start gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">DIRECTORIO MOCK</Badge>
            <span className="text-xs text-[color:var(--text-muted)]">
              Fuente única para la demo de nómina
            </span>
          </div>
          <h1 className="page-title">Empleados</h1>
          <p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">
            Registra personal y define su sucursal, tipo de nómina y acceso
            inicial. Los cambios se reflejan al instante en Roles y accesos.
          </p>
        </div>
        <Button
          size="sm"
          className="self-start rounded-lg px-3 xl:self-auto"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nuevo empleado
        </Button>
      </header>

      <Card className="overflow-hidden border-[color:var(--border-color)]">
        <CardContent className="grid divide-y divide-[color:var(--border-color)] p-0 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            {
              icon: UsersRound,
              label: "Personal activo",
              value: activeEmployees,
              detail: "empleados",
            },
            {
              icon: Building2,
              label: "Cobertura",
              value: branchesCovered,
              detail: "sucursales",
            },
            {
              icon: CircleDollarSign,
              label: "Nómina fija mensual",
              value: money.format(monthlyFixedCost),
              detail: "mock",
            },
          ].map(({ icon: Icon, label, value, detail }) => (
            <div
              key={label}
              className="flex min-w-0 items-center gap-3 px-4 py-3.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#c3a583]/40 bg-[#c3a583]/10 text-[#8a6744]">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                  {label}
                </p>
                <p className="number-display truncate text-lg leading-tight">
                  {value}{" "}
                  <span className="text-xs font-normal text-[color:var(--text-muted)]">
                    {detail}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-[color:var(--border-color)]">
        <CardHeader className="border-b border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/15 px-4 py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <WalletCards className="h-3.5 w-3.5 text-[color:var(--text-secondary)]" />
                <CardTitle className="text-xs font-semibold uppercase tracking-[0.06em]">
                  Directorio vigente
                </CardTitle>
              </div>
              <CardDescription className="mt-0.5 text-[11px]">
                Datos ficticios para cálculo, pagos y control de acceso.
              </CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="h-8 bg-[color:var(--bg-card)] pl-8 pr-10 text-[10px]"
                placeholder="BUSCAR NOMBRE, PUESTO, SUCURSAL O ROL"
                aria-label="Buscar empleados"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-[color:var(--text-muted)]">
                {filteredEmployees.length}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden grid-cols-[minmax(180px,1.4fr)_minmax(130px,1fr)_minmax(135px,1fr)_minmax(145px,1fr)_72px] gap-3 border-b border-[color:var(--border-color)] bg-[color:var(--bg-card)] px-4 py-1.5 text-[8px] font-semibold uppercase tracking-[0.11em] text-[color:var(--text-muted)] md:grid">
            <span>Empleado / sucursal</span>
            <span>Nómina / acceso</span>
            <span>Pago / cuenta</span>
            <span>Vigencia</span>
            <span></span>
          </div>
          <div className="divide-y divide-[color:var(--border-color)]">
            {pagedEmployees.map((employee) => {
              const branch = state.branches.find(
                (item) => item.id === employee.branchId,
              );
              const costBranches = employeeCostBranchIds(
                employee,
                state.branches,
              );
              const costBranchLabel =
                costBranches.length === state.branches.length
                  ? `TODAS · ${costBranches.length}`
                  : costBranches.length === 1
                    ? (state.branches.find(
                        (item) => item.id === costBranches[0],
                      )?.name ?? "SIN COSTO")
                    : `${costBranches.length} SUCURSALES`;
              const role = state.roles.find(
                (item) => item.id === employee.roleId,
              );
              const today = localDate();
              const status =
                employee.terminationDate && employee.terminationDate < today
                  ? "BAJA"
                  : employee.terminationDate
                    ? "BAJA PROGRAMADA"
                    : employee.hireDate > today
                      ? "ALTA PROGRAMADA"
                      : "ACTIVO";
              return (
                <div
                  key={employee.id}
                  className="grid grid-cols-2 gap-x-3 gap-y-2 px-4 py-2 transition-colors hover:bg-[color:var(--accent-hover)]/20 md:grid-cols-[minmax(180px,1.4fr)_minmax(130px,1fr)_minmax(135px,1fr)_minmax(145px,1fr)_72px] md:items-center"
                >
                  <div className="col-span-2 flex min-w-0 items-center gap-2.5 md:col-span-1">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#c3a583]/45 bg-[#342b23] text-[9px] font-bold text-[#f0d9b8]">
                      {initials(employee.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[11px] font-semibold">
                          {employee.name}
                        </p>
                        <Badge
                          variant="outline"
                          className={`shrink-0 px-1.5 py-0 text-[8px] md:hidden ${employee.active ? "border-emerald-300 text-emerald-700 dark:text-emerald-300" : "border-stone-300 text-stone-500"}`}
                        >
                          {employee.active ? "ACTIVO" : "INACTIVO"}
                        </Badge>
                      </div>
                      <p className="truncate text-[9px] uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                        {employee.position} · {branch?.name ?? "SIN SUCURSAL"}
                      </p>
                      <p className="mt-0.5 truncate text-[8px] font-semibold uppercase tracking-[0.06em] text-[#987049]">
                        Costo: {costBranchLabel}
                      </p>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] uppercase tracking-[0.08em] text-[color:var(--text-muted)] md:hidden">
                      Nómina / acceso
                    </p>
                    <p className="truncate text-[10px] font-semibold">
                      {categoryLabels[employee.category]}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 shrink-0 text-[#987049]" />
                      <p className="truncate text-[9px] text-[color:var(--text-muted)]">
                        {role?.name ?? "SIN ROL"}
                      </p>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] uppercase tracking-[0.08em] text-[color:var(--text-muted)] md:hidden">
                      Pago / cuenta
                    </p>
                    <p className="number-display truncate text-[11px]">
                      {money.format(employee.monthlySalary)}
                    </p>
                    <p className="mt-0.5 truncate text-[9px] text-[color:var(--text-muted)]">
                      {employee.bank} · {employee.account}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] uppercase tracking-[0.08em] text-[color:var(--text-muted)] md:hidden">
                      Vigencia
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={`shrink-0 px-1.5 py-0 text-[8px] ${status === "ACTIVO" ? "border-emerald-300 text-emerald-700 dark:text-emerald-300" : "border-amber-300 text-amber-700 dark:text-amber-300"}`}
                      >
                        {status === "ACTIVO" ? (
                          <BadgeCheck className="mr-1 h-2.5 w-2.5" />
                        ) : null}
                        {status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-[9px] text-[color:var(--text-muted)]">
                      {employee.hireDate} →{" "}
                      {employee.terminationDate ?? "VIGENTE"}
                    </p>
                  </div>
                  <div className="flex justify-end gap-0.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setProfileEmployee(employee)}
                      aria-label={`Editar perfil de ${employee.name}`}
                      title="Editar perfil y acceso"
                    >
                      <UserCog className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEmploymentEmployee(employee)}
                      aria-label={`Editar vigencia de ${employee.name}`}
                      title="Editar alta o baja"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {filteredEmployees.length === 0 && (
              <div className="px-4 py-12 text-center">
                <Search className="mx-auto h-5 w-5 text-[color:var(--text-muted)]" />
                <p className="mt-2 text-sm font-semibold">Sin coincidencias</p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  Prueba con otro nombre, puesto, sucursal o rol.
                </p>
              </div>
            )}
          </div>
          {filteredEmployees.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/10 px-4 py-2.5 text-[10px] sm:flex-row sm:items-center sm:justify-between">
              <p>
                Mostrando{" "}
                <strong className="text-[color:var(--text-primary)]">
                  {visibleStart}–{visibleEnd}
                </strong>{" "}
                de{" "}
                <strong className="text-[color:var(--text-primary)]">
                  {filteredEmployees.length}
                </strong>{" "}
                empleados · página {currentPage} de {totalPages}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <Label className="text-[9px] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                  Filas
                </Label>
                <Select
                  value={pageSize}
                  onValueChange={(value) => {
                    setPageSize(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger
                    className="h-7 w-[82px] rounded-lg text-[9px] font-semibold"
                    aria-label="Empleados por página"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[20, 40, 60].map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                    <SelectItem value="ALL">TODAS</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-lg px-2 text-[9px]"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <ChevronLeft className="mr-1 h-3 w-3" />
                  Anterior
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-lg px-2 text-[9px]"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                >
                  Siguiente
                  <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EmployeeDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <EmployeeProfileDialog
        key={profileEmployee?.id ?? "profile-closed"}
        employee={profileEmployee}
        onOpenChange={(open) => {
          if (!open) setProfileEmployee(null);
        }}
      />
      <EmploymentDialog
        key={employmentEmployee?.id ?? "closed"}
        employee={employmentEmployee}
        onOpenChange={(open) => {
          if (!open) setEmploymentEmployee(null);
        }}
      />
    </div>
  );
}
