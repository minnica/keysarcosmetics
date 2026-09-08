"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, CalendarCheck2, Delete, Eye, EyeOff, KeyRound, LockKeyhole, ReceiptText, ShieldCheck, Sparkles, UserRound, WalletCards } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Label, toast } from "@cosmetics/ui";
import { usePayrollDemo } from "@/components/payroll/payroll-demo-context";

const accessHighlights = [
  { icon: CalendarCheck2, label: "Periodos protegidos", detail: "Vigencia histórica por quincena" },
  { icon: ReceiptText, label: "Recibos auditables", detail: "Nómina y movimientos consolidados" },
  { icon: ShieldCheck, label: "Acceso por perfil", detail: "Información aislada por usuario" },
];

export default function LoginPage() {
  const router = useRouter();
  const { state, startSession, endSession, updateEmployeeCredentials } = usePayrollDemo();
  const [user, setUser] = useState("MASTER DEMO");
  const [password, setPassword] = useState("NOMINA2026");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"CREDENTIALS" | "SETUP" | "SECOND_KEY">("CREDENTIALS");
  const [secondaryKey, setSecondaryKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newAccessCode, setNewAccessCode] = useState("");
  const [confirmAccessCode, setConfirmAccessCode] = useState("");
  const [pendingEmployeeId, setPendingEmployeeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pendingEmployee = state.employees.find((employee) => employee.id === pendingEmployeeId);
  const sessionResetRef = useRef(false);

  useEffect(() => {
    if (sessionResetRef.current) return;
    sessionResetRef.current = true;
    endSession();
  }, [endSession]);

  function resolveEmployee() {
    const normalized = user.trim().toLocaleUpperCase("es-MX");
    return state.employees.find((employee) => (employee.username ?? employee.name).toLocaleUpperCase("es-MX") === normalized || employee.name === normalized);
  }

  function enterPortal(employeeId: string) {
    const employee = state.employees.find((item) => item.id === employeeId);
    const role = state.roles.find((item) => item.id === employee?.roleId);
    setSubmitting(true);
    startSession(employeeId);
    window.setTimeout(() => router.replace(role?.id === "role-admin" ? "/" : "/mi-nomina"), 350);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === "CREDENTIALS") {
      if (!user.trim() || !password.trim()) {
        toast.error("Captura tu usuario y clave de acceso.");
        return;
      }
      const employee = resolveEmployee();
      const expectedPassword = employee?.accessPassword ?? "NOMINA2026";
      if (!employee || password !== expectedPassword) {
        toast.error("Usuario o clave de acceso incorrectos.");
        return;
      }
      if (!employee.active) {
        toast.error("Este portal no se encuentra activo. Solicita apoyo al usuario máster.");
        return;
      }
      setPendingEmployeeId(employee.id);
      setSecondaryKey("");
      setNewPassword("");
      setConfirmPassword("");
      setNewAccessCode("");
      setConfirmAccessCode("");
      setStep(employee.mustChangeCredentials !== false || !employee.secondaryAccessKey ? "SETUP" : "SECOND_KEY");
      return;
    }
    if (step === "SETUP") {
      if (!pendingEmployee) return;
      if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
        toast.error("Crea una contraseña de al menos 8 caracteres que incluya letras y números.");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("Las contraseñas no coinciden.");
        return;
      }
      if (newPassword === (pendingEmployee.accessPassword ?? "NOMINA2026")) {
        toast.error("La nueva contraseña debe ser diferente a la temporal.");
        return;
      }
      if (!/^\d{4}$/.test(newAccessCode) || newAccessCode !== confirmAccessCode) {
        toast.error("Confirma un código privado de cuatro dígitos.");
        return;
      }
      updateEmployeeCredentials(pendingEmployee.id, newPassword, newAccessCode);
      toast.success("Tu contraseña y código privado quedaron configurados.");
      enterPortal(pendingEmployee.id);
      return;
    }
    if (secondaryKey.length !== 4 || secondaryKey !== pendingEmployee?.secondaryAccessKey) {
      toast.error("Código privado incorrecto. Intenta nuevamente.");
      setSecondaryKey("");
      return;
    }
    if (pendingEmployee) enterPortal(pendingEmployee.id);
  }

  function addDigit(digit: string) {
    setSecondaryKey((current) => current.length < 4 ? `${current}${digit}` : current);
  }

  function resetLogin() {
    setStep("CREDENTIALS");
    setSecondaryKey("");
    setPendingEmployeeId(null);
    setNewPassword("");
    setConfirmPassword("");
    setNewAccessCode("");
    setConfirmAccessCode("");
  }

  function selectDemoAccount(nextUser: string, nextPassword: string) {
    resetLogin();
    setUser(nextUser);
    setPassword(nextPassword);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#171411] p-4 sm:p-7 lg:p-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_8%,rgba(202,161,119,.18),transparent_28rem),radial-gradient(circle_at_90%_90%,rgba(100,134,114,.12),transparent_30rem)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.45)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.45)_1px,transparent_1px)] [background-size:42px_42px]" />

      <Card className="relative mx-auto min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden border-[#80664d]/55 bg-[#211c18] shadow-[0_38px_110px_rgba(0,0,0,.48)] sm:min-h-[calc(100vh-3.5rem)] lg:min-h-[calc(100vh-5rem)]">
        <CardContent className="grid min-h-[inherit] p-0 lg:grid-cols-[1.08fr_.92fr]">
          <section className="relative hidden overflow-hidden border-r border-white/10 bg-[linear-gradient(145deg,#2b241e_0%,#171411_72%)] p-12 lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full border border-[#cba27c]/20" />
            <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full border border-[#cba27c]/15" />
            <div className="relative">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d2ad84]/45 bg-[#d2ad84]/10 shadow-[inset_0_1px_0_rgba(255,255,255,.12)]"><Image src="/logo.svg" alt="Keysar Cosmetics" width={48} height={48} className="h-12 w-12" /></span>
                <div><p className="font-brand text-2xl uppercase tracking-[0.2em] text-[#f3e5d2]">Keysar</p><p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#cda57e]">Cosmetics · Payroll</p></div>
              </div>

              <Badge className="mt-16 border border-[#d8b58d]/30 bg-[#d8b58d]/10 text-[#e8c9a7]"><Sparkles className="mr-1.5 h-3.5 w-3.5" />CONTROL EJECUTIVO DE NÓMINA</Badge>
              <h1 className="mt-6 max-w-lg font-brand text-5xl font-normal leading-[1.08] tracking-[0.025em] text-[#fff8ee]">Cada pago,<br />bajo control.</h1>
              <p className="mt-5 max-w-md text-sm leading-7 text-[#b9ada2]">Consulta periodos, valida movimientos y autoriza recibos desde un entorno diseñado para proteger la trazabilidad de cada nómina.</p>

              <div className="mt-10 grid gap-3">
                {accessHighlights.map(({ icon: Icon, label, detail }) => (
                  <div key={label} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#cda57e]/25 bg-[#cda57e]/10 text-[#e3bd92]"><Icon className="h-4 w-4" /></span>
                    <div><p className="text-xs font-semibold text-[#f2e8dc]">{label}</p><p className="mt-0.5 text-[10px] text-[#978c82]">{detail}</p></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex items-center justify-between border-t border-white/10 pt-6 text-[9px] uppercase tracking-[0.16em] text-[#897e75]"><span>Keysar Cosmetics</span><span>Acceso confidencial</span></div>
          </section>

          <section className="flex items-center bg-[linear-gradient(155deg,#fffdf9_0%,#f2ebe3_100%)] px-6 py-10 text-[#27221e] sm:px-12 lg:px-16 dark:bg-[linear-gradient(155deg,#28221d_0%,#1e1a17_100%)] dark:text-[#f4ede5]">
            <div className="mx-auto w-full max-w-md">
              <div className="flex items-center gap-3 lg:hidden"><Image src="/logo.svg" alt="Keysar Cosmetics" width={44} height={44} /><div><p className="font-brand text-xl uppercase tracking-[0.18em]">Keysar</p><p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#9b6a43]">Cosmetics · Payroll</p></div></div>
              <div className="mt-10 lg:mt-0">
                <div className="flex items-center gap-2 text-[#9b6a43]"><WalletCards className="h-4 w-4" /><span className="text-[10px] font-semibold uppercase tracking-[0.16em]">Portal confidencial · {step === "CREDENTIALS" ? "Identificación" : step === "SETUP" ? "Primer acceso" : "Código privado"}</span></div>
                <h2 className="mt-4 font-brand text-4xl font-normal tracking-[0.025em]">{step === "CREDENTIALS" ? "Bienvenido" : step === "SETUP" ? "Protege tu cuenta" : "Verificación privada"}</h2>
                <p className="mt-2 text-sm leading-6 text-[#776d65] dark:text-[#b8aca1]">{step === "CREDENTIALS" ? "Ingresa con tu usuario y contraseña para abrir exclusivamente el espacio correspondiente a tu perfil." : step === "SETUP" ? `Crea la contraseña definitiva y el código privado de ${pendingEmployee?.name ?? "tu cuenta"}.` : `Captura el código privado de ${pendingEmployee?.name ?? "tu cuenta"}; el navegador no puede completarlo.`}</p>
              </div>

              <form onSubmit={submit} className="mt-9 space-y-5">
                {step === "CREDENTIALS" ? <>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#c9aa88]/35 bg-white/45 p-2 dark:bg-black/10" aria-label="Perfiles de demostración">
                    <button type="button" onClick={() => selectDemoAccount("VENDEDOR DEMO", "VENTAS2026")} className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${user === "VENDEDOR DEMO" ? "border-[#9b6a43] bg-[#eadbc9] text-[#4f3725] dark:bg-[#9b6a43]/25 dark:text-[#f5e4cf]" : "border-transparent text-[#776d65] hover:bg-[#efe4d8] dark:text-[#b8aca1] dark:hover:bg-white/[0.05]"}`}>
                      <span className="block text-[9px] font-semibold uppercase tracking-[0.12em]">Empleado</span>
                      <span className="mt-1 block text-[10px]">Portal personal</span>
                    </button>
                    <button type="button" onClick={() => selectDemoAccount("MASTER DEMO", "NOMINA2026")} className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${user === "MASTER DEMO" ? "border-[#9b6a43] bg-[#eadbc9] text-[#4f3725] dark:bg-[#9b6a43]/25 dark:text-[#f5e4cf]" : "border-transparent text-[#776d65] hover:bg-[#efe4d8] dark:text-[#b8aca1] dark:hover:bg-white/[0.05]"}`}>
                      <span className="block text-[9px] font-semibold uppercase tracking-[0.12em]">Máster</span>
                      <span className="mt-1 block text-[10px]">Control general</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demo-user" className="text-[10px] font-semibold uppercase tracking-[0.12em]">Usuario</Label>
                    <div className="relative"><UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a47a52]" /><Input id="demo-user" autoComplete="username" value={user} onChange={(event) => setUser(event.target.value.toLocaleUpperCase("es-MX"))} className="h-12 pl-11 text-sm" placeholder="USUARIO" /></div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demo-password" className="text-[10px] font-semibold uppercase tracking-[0.12em]">Clave de acceso</Label>
                    <div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a47a52]" /><Input id="demo-password" autoComplete="current-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 pl-11 pr-11 text-sm" placeholder="CLAVE" /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#776d65] hover:bg-[#eaded2] hover:text-[#5f432d]" aria-label={showPassword ? "Ocultar clave" : "Mostrar clave"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                  </div>
                </> : step === "SETUP" ? <div className="space-y-4">
                  <div className="rounded-2xl border border-[#c9aa88]/45 bg-white/55 p-4 shadow-sm dark:bg-black/10">
                    <div className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-[#9b6a43]" /><p className="text-[10px] font-semibold uppercase tracking-[0.12em]">Credenciales personales</p></div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5"><Label htmlFor="new-password" className="text-[9px] uppercase tracking-[0.1em]">Nueva contraseña</Label><Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Mínimo 8 caracteres" /></div>
                      <div className="space-y-1.5"><Label htmlFor="confirm-password" className="text-[9px] uppercase tracking-[0.1em]">Confirmar contraseña</Label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repite la contraseña" /></div>
                      <div className="space-y-1.5"><Label htmlFor="new-access-code" className="text-[9px] uppercase tracking-[0.1em]">Código privado</Label><Input id="new-access-code" type="password" inputMode="numeric" maxLength={4} autoComplete="off" data-1p-ignore="true" data-lpignore="true" value={newAccessCode} onChange={(event) => setNewAccessCode(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="4 dígitos" /></div>
                      <div className="space-y-1.5"><Label htmlFor="confirm-access-code" className="text-[9px] uppercase tracking-[0.1em]">Confirmar código</Label><Input id="confirm-access-code" type="password" inputMode="numeric" maxLength={4} autoComplete="off" data-1p-ignore="true" data-lpignore="true" value={confirmAccessCode} onChange={(event) => setConfirmAccessCode(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Repite el código" /></div>
                    </div>
                    <p className="mt-3 text-[10px] leading-4 text-[#776d65] dark:text-[#b8aca1]">La contraseña debe contener letras y números. El código se solicitará en cada sesión y no admite autocompletado.</p>
                  </div>
                  <button type="button" onClick={resetLogin} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#806044] hover:text-[#4e3828]"><ArrowLeft className="h-3.5 w-3.5" />Cambiar usuario</button>
                </div> : <div className="space-y-4">
                  <div className="rounded-2xl border border-[#c9aa88]/45 bg-white/55 p-4 shadow-sm dark:bg-black/10">
                    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-[#9b6a43]" /><Label htmlFor="secondary-access-key" className="text-[10px] font-semibold uppercase tracking-[0.12em]">Código privado</Label></div><Badge variant="outline" className="text-[9px]">NO AUTOLLENABLE</Badge></div>
                    <Input id="secondary-access-key" name="secondary-access-verification" type="password" value={secondaryKey} readOnly autoComplete="off" data-1p-ignore="true" data-lpignore="true" className="mt-3 h-12 text-center text-xl tracking-[0.55em]" aria-label="Código privado capturado con teclado seguro" />
                    <div className="mt-3 grid grid-cols-3 gap-2">{["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => <button key={digit} type="button" onClick={() => addDigit(digit)} className="h-10 rounded-xl border border-[#c9aa88]/40 bg-[#fffaf4] text-sm font-semibold shadow-sm transition-colors hover:border-[#9b6a43] hover:bg-[#efe2d4] dark:bg-white/[0.04]">{digit}</button>)}<button type="button" onClick={() => setSecondaryKey("")} className="h-10 rounded-xl border border-[#c9aa88]/30 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#776d65]">Limpiar</button><button type="button" onClick={() => addDigit("0")} className="h-10 rounded-xl border border-[#c9aa88]/40 bg-[#fffaf4] text-sm font-semibold shadow-sm hover:border-[#9b6a43] dark:bg-white/[0.04]">0</button><button type="button" onClick={() => setSecondaryKey((current) => current.slice(0, -1))} className="flex h-10 items-center justify-center rounded-xl border border-[#c9aa88]/30 text-[#776d65]" aria-label="Borrar último dígito"><Delete className="h-4 w-4" /></button></div>
                  </div>
                  <button type="button" onClick={resetLogin} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#806044] hover:text-[#4e3828]"><ArrowLeft className="h-3.5 w-3.5" />Cambiar usuario</button>
                </div>}

                <Button type="submit" className="h-11 w-full rounded-xl" disabled={submitting}><BadgeCheck className="mr-2 h-4 w-4" />{submitting ? "Abriendo espacio…" : step === "CREDENTIALS" ? "Continuar verificación" : step === "SETUP" ? "Guardar y abrir mi perfil" : "Verificar e ingresar"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
              </form>

              <div className="mt-7 rounded-xl border border-[#c9aa88]/35 bg-[#c9aa88]/10 px-4 py-3"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#9b6a43]" /><div><p className="text-[11px] font-semibold">Accesos de demostración</p><p className="mt-1 text-[10px] leading-4 text-[#776d65] dark:text-[#b8aca1]">Empleado: VENDEDOR DEMO · clave: VENTAS2026 · código: 1470.</p><p className="mt-0.5 text-[10px] leading-4 text-[#776d65] dark:text-[#b8aca1]">Máster: MASTER DEMO · clave: NOMINA2026 · código: 2580. La validación se conserva únicamente en memoria.</p></div></div></div>
            </div>
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
