"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  Banknote,
  CalendarCheck2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  History,
  MessageSquareText,
  ReceiptText,
  Search,
  Send,
  ShieldCheck,
  UserRound,
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
import { usePayrollDemo } from "./payroll-demo-context";
import { Receipt } from "./payroll-receipts-demo";
import type { EmployeePayrollLine } from "./payroll-demo-context";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");
}

export function PayrollReceiptsExecutiveDemo() {
  const { state, currentPeriod, periodOptions, payrollLines, setDecision } =
    usePayrollDemo();
  const [periodStart, setPeriodStart] = useState(currentPeriod.start);
  const [preview, setPreview] = useState<{
    line: EmployeePayrollLine;
    period: { start: string; end: string };
  } | null>(null);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState("20");
  const [page, setPage] = useState(1);
  const [clarificationOpen, setClarificationOpen] = useState(false);
  const [clarification, setClarification] = useState("");
  const period =
    periodOptions.find((item) => item.start === periodStart) ?? currentPeriod;
  const run = state.runs.find((item) => item.periodStart === periodStart);
  const lines = payrollLines(periodStart, state.calculationMode);
  const activeEmployee = state.employees.find(
    (item) => item.id === state.activeEmployeeId,
  );
  const activeRole = state.roles.find(
    (item) => item.id === activeEmployee?.roleId,
  );
  const isMaster = activeRole?.id === "role-admin";
  const cutoffLine = payrollLines(
    currentPeriod.start,
    state.calculationMode,
  ).find((line) => line.employee.id === activeEmployee?.id);
  const cutoffDecision = state.decisions.find(
    (item) =>
      item.employeeId === activeEmployee?.id &&
      item.periodStart === currentPeriod.start,
  );
  const currentYear = currentPeriod.start.slice(0, 4);
  const annualReceiptHistory = activeEmployee
    ? periodOptions.flatMap((historyPeriod) => {
        if (!historyPeriod.start.startsWith(currentYear)) return [];
        const historyDecision = state.decisions.find(
          (item) =>
            item.employeeId === activeEmployee.id &&
            item.periodStart === historyPeriod.start &&
            item.status === "AUTHORIZED",
        );
        if (!historyDecision) return [];
        const historyLine = payrollLines(
          historyPeriod.start,
          state.calculationMode,
        ).find((line) => line.employee.id === activeEmployee.id);
        return historyLine
          ? [
              {
                period: historyPeriod,
                line: historyLine,
                decision: historyDecision,
              },
            ]
          : [];
      })
    : [];
  const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");
  const visibleLines = useMemo(
    () =>
      lines.filter((line) => {
        const branch =
          state.branches.find((item) => item.id === line.employee.branchId)
            ?.name ?? "";
        return (
          !normalizedSearch ||
          `${line.employee.name} ${line.employee.position} ${line.employee.bank} ${branch}`
            .toLocaleLowerCase("es-MX")
            .includes(normalizedSearch)
        );
      }),
    [lines, normalizedSearch, state.branches],
  );
  const effectivePageSize =
    pageSize === "ALL" ? Math.max(visibleLines.length, 1) : Number(pageSize);
  const totalPages = Math.max(
    1,
    Math.ceil(visibleLines.length / effectivePageSize),
  );
  const currentPage = Math.min(page, totalPages);
  const pagedLines = visibleLines.slice(
    (currentPage - 1) * effectivePageSize,
    currentPage * effectivePageSize,
  );
  const visibleStart =
    visibleLines.length === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1;
  const visibleEnd = Math.min(
    currentPage * effectivePageSize,
    visibleLines.length,
  );
  const totalNet = lines.reduce((sum, line) => sum + line.total, 0);
  const approvedLines = lines.filter((line) =>
    state.decisions.some(
      (decision) =>
        decision.employeeId === line.employee.id &&
        decision.periodStart === periodStart &&
        decision.status === "AUTHORIZED",
    ),
  );
  const pendingLines = lines.filter(
    (line) =>
      !approvedLines.some(
        (approved) => approved.employee.id === line.employee.id,
      ),
  );
  const allApproved = lines.length > 0 && pendingLines.length === 0;

  const authorizeOwnReceipt = () => {
    if (!activeEmployee || !cutoffLine) return;
    setDecision(
      activeEmployee.id,
      currentPeriod.start,
      "AUTHORIZED",
      "NÓMINA APROBADA POR EL USUARIO",
    );
    toast.success(
      "Recibo del corte autorizado y trasladado al historial anual.",
    );
  };

  const requestClarification = () => {
    if (!activeEmployee || !clarification.trim())
      return toast.error("Escribe el motivo de la aclaración.");
    setDecision(
      activeEmployee.id,
      currentPeriod.start,
      "CLARIFICATION",
      clarification.trim(),
    );
    setClarification("");
    setClarificationOpen(false);
    toast.success("La aclaración quedó registrada para revisión.");
  };

  if (!isMaster) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline">ACCESO PERSONAL</Badge>
              <span className="text-xs text-[color:var(--text-muted)]">
                Visible únicamente para ti
              </span>
            </div>
            <h1 className="page-title">Mi recibo de nómina</h1>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Solo puedes revisar y autorizar el recibo correspondiente al corte
              vigente.
            </p>
          </div>
          <div className="w-full max-w-sm rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] px-4 py-3">
            <p className="label-caps">PERIODO DE CORTE</p>
            <p className="mt-1 text-sm font-semibold">{currentPeriod.label}</p>
            <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">
              {currentPeriod.start} — {currentPeriod.end}
            </p>
          </div>
        </header>
        {!cutoffLine ? (
          <Card>
            <CardContent className="flex flex-col items-center px-6 py-14 text-center">
              <UserRound className="h-9 w-9 text-[color:var(--text-muted)]" />
              <p className="mt-3 font-semibold">
                No existe un recibo para este corte
              </p>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                Cuando la nómina del periodo de corte incluya movimientos a tu
                nombre, el resumen aparecerá aquí.
              </p>
            </CardContent>
          </Card>
        ) : cutoffDecision?.status === "AUTHORIZED" ? (
          <Card className="border-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/20">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <div>
                  <p className="font-semibold">Recibo del corte autorizado</p>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                    La información salió de la bandeja pendiente y quedó
                    disponible en tu historial {currentYear}.
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-emerald-300 text-emerald-800 dark:text-emerald-200"
              >
                APROBADO POR USUARIO
              </Badge>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border-[color:var(--border-color)]">
            <CardHeader className="border-b border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/15">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>{cutoffLine.employee.name}</CardTitle>
                  <CardDescription>
                    {cutoffLine.employee.position} ·{" "}
                    {
                      state.branches.find(
                        (item) => item.id === cutoffLine.employee.branchId,
                      )?.name
                    }
                  </CardDescription>
                </div>
                <DecisionBadge status={cutoffDecision?.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <Summary
                  label="PERIODO DE CORTE"
                  value={`${currentPeriod.start} — ${currentPeriod.end}`}
                />
                <Summary
                  label="CUENTA DE PAGO"
                  value={`${cutoffLine.employee.bank} · ${cutoffLine.employee.account}`}
                />
                <Summary
                  label="NETO A PAGAR"
                  value={money.format(cutoffLine.total)}
                  large
                />
              </div>
              {cutoffDecision?.status === "CLARIFICATION" && (
                <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:bg-amber-950/25 dark:text-amber-100">
                  <MessageSquareText className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">
                      Aclaración en revisión
                    </p>
                    <p className="mt-1 text-xs">{cutoffDecision.note}</p>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setPreview({ line: cutoffLine, period: currentPeriod })
                  }
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver recibo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toast.success(
                      "Descarga simulada: el backend no fue utilizado.",
                    )
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setClarificationOpen(true)}
                >
                  <MessageSquareText className="mr-2 h-4 w-4" />
                  Solicitar aclaración
                </Button>
                <Button size="sm" onClick={authorizeOwnReceipt}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Aprobar recibo del corte
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="overflow-hidden border-[color:var(--border-color)]">
          <CardHeader className="border-b border-[color:var(--border-color)] py-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--accent-hover)]">
                <History className="h-4 w-4 text-[color:var(--text-secondary)]" />
              </span>
              <div>
                <CardTitle className="section-heading uppercase">
                  Historial anual de recibos · {currentYear}
                </CardTitle>
                <CardDescription>
                  Solo conserva y muestra los recibos autorizados del año en
                  curso.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {annualReceiptHistory.length ? (
              <div className="divide-y divide-[color:var(--border-color)]">
                {annualReceiptHistory.map((entry) => (
                  <div
                    key={entry.period.start}
                    className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(220px,1fr)_150px_150px] sm:items-center"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {entry.period.label}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[color:var(--text-muted)]">
                        {entry.period.start} — {entry.period.end} · APROBADO POR
                        USUARIO
                      </p>
                    </div>
                    <p className="number-display text-sm sm:text-right">
                      {money.format(entry.line.total)}
                    </p>
                    <div className="flex justify-end gap-1">
                      <IconButton
                        label={`Ver recibo de ${entry.period.label}`}
                        onClick={() =>
                          setPreview({ line: entry.line, period: entry.period })
                        }
                        icon={<Eye className="h-4 w-4" />}
                      />
                      <IconButton
                        label={`Descargar recibo de ${entry.period.label}`}
                        onClick={() =>
                          toast.success(
                            "Descarga simulada: el backend no fue utilizado.",
                          )
                        }
                        icon={<Download className="h-4 w-4" />}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <CalendarCheck2 className="h-7 w-7 text-[color:var(--text-muted)]" />
                <p className="mt-3 text-sm font-semibold">
                  Sin recibos autorizados en {currentYear}
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  El recibo del corte aparecerá aquí después de aprobarlo.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <Dialog open={clarificationOpen} onOpenChange={setClarificationOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar aclaración</DialogTitle>
              <DialogDescription>
                Describe el concepto o importe de tu recibo que debe revisarse.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="receipt-clarification">Detalle</Label>
              <Textarea
                id="receipt-clarification"
                value={clarification}
                onChange={(event) => setClarification(event.target.value)}
                placeholder="EJ. SOLICITO VALIDAR EL IMPORTE DE MI COMISIÓN"
              />
            </div>
            <DialogFooter>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setClarificationOpen(false)}
              >
                Cancelar
              </Button>
              <Button size="sm" onClick={requestClarification}>
                Enviar aclaración
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <ReceiptPreview preview={preview} onClose={() => setPreview(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              VISTA USUARIO MÁSTER
            </Badge>
            <span className="text-xs text-[color:var(--text-muted)]">
              Control general de autorizaciones
            </span>
          </div>
          <h1 className="page-title">Recibos del periodo</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Consulta quién aprobó su nómina e identifica inmediatamente las
            autorizaciones pendientes.
          </p>
        </div>
        <PeriodSelector
          value={periodStart}
          onChange={setPeriodStart}
          options={periodOptions}
        />
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          icon={<ReceiptText className="h-5 w-5" />}
          label="RECIBOS"
          value={`${lines.length}`}
        />
        <Metric
          icon={<Banknote className="h-5 w-5" />}
          label="TOTAL NETO"
          value={money.format(totalNet)}
        />
        <Metric
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="APROBADOS POR USUARIO"
          value={`${approvedLines.length} / ${lines.length}`}
          note={`Corrida ${run?.status ?? "SIN CORRIDA"}`}
        />
      </div>

      <section
        className={`rounded-2xl border p-4 ${allApproved ? "border-emerald-400 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100" : "border-rose-400 bg-rose-50 text-rose-950 dark:bg-rose-950/30 dark:text-rose-100"}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex gap-3">
          {allApproved ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {allApproved
                ? "Autorización de nómina completa"
                : `Faltan ${pendingLines.length} ${pendingLines.length === 1 ? "recibo" : "recibos"} por aprobar`}
            </p>
            <p className="mt-1 text-xs leading-5">
              {allApproved
                ? `Los ${lines.length} recibos del periodo fueron aprobados por el personal.`
                : "Las siguientes personas aún no han aprobado su recibo:"}
            </p>
            {!allApproved && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {pendingLines.slice(0, 12).map((line) => (
                  <Badge
                    key={line.employee.id}
                    variant="outline"
                    className="border-rose-300 bg-white/70 text-[10px] text-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
                  >
                    {line.employee.name}
                  </Badge>
                ))}
                {pendingLines.length > 12 && (
                  <Badge
                    variant="outline"
                    className="border-rose-300 bg-white/70 text-[10px] text-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
                  >
                    +{pendingLines.length - 12} pendientes
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <Card className="overflow-hidden border-[color:var(--border-color)]">
        <CardHeader className="border-b border-[color:var(--border-color)] py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="section-heading uppercase">
                Personal del periodo
              </CardTitle>
              <CardDescription>
                Importe neto, autorización individual y acciones
                administrativas.
              </CardDescription>
            </div>
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <Input
                className="h-9 pl-9"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="BUSCAR EMPLEADO, PUESTO O SUCURSAL"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden grid-cols-[minmax(220px,1.35fr)_minmax(190px,1fr)_140px_185px_132px] gap-4 border-b border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/20 px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)] md:grid">
            <span>Empleado</span>
            <span>Puesto / cuenta</span>
            <span className="text-right">Neto a pagar</span>
            <span>Estatus</span>
            <span className="text-right">Acciones</span>
          </div>
          <div className="divide-y divide-[color:var(--border-color)]">
            {pagedLines.map((line) => {
              const decision = state.decisions.find(
                (item) =>
                  item.employeeId === line.employee.id &&
                  item.periodStart === periodStart,
              );
              const branch = state.branches.find(
                (item) => item.id === line.employee.branchId,
              );
              return (
                <div
                  key={line.employee.id}
                  className="grid gap-3 px-4 py-3 transition-colors hover:bg-[color:var(--accent-hover)]/20 md:grid-cols-[minmax(220px,1.35fr)_minmax(190px,1fr)_140px_185px_132px] md:items-center md:gap-4 md:px-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/35 text-xs font-semibold">
                      {initials(line.employee.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {line.employee.name}
                      </p>
                      <p className="truncate text-[11px] text-[color:var(--text-muted)]">
                        {branch?.name} · {line.employee.category}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="truncate text-xs font-medium">
                      {line.employee.position}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
                      {line.employee.bank} · {line.employee.account}
                    </p>
                  </div>
                  <div className="md:text-right">
                    <p className="number-display text-base">
                      {money.format(line.total)}
                    </p>
                    <p className="text-[10px] text-[color:var(--text-muted)]">
                      NETO DEL PERIODO
                    </p>
                  </div>
                  <div>
                    <DecisionBadge status={decision?.status} />
                    {decision?.updatedAt && (
                      <p className="mt-1 text-[9px] text-[color:var(--text-muted)]">
                        Actualizado{" "}
                        {new Date(decision.updatedAt).toLocaleString("es-MX", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-start gap-1 md:justify-end">
                    <IconButton
                      label={`Previsualizar recibo de ${line.employee.name}`}
                      onClick={() => setPreview({ line, period })}
                      icon={<Eye className="h-4 w-4" />}
                    />
                    <IconButton
                      label={`Descargar recibo de ${line.employee.name}`}
                      onClick={() =>
                        toast.success(
                          "Descarga simulada: el backend no fue utilizado.",
                        )
                      }
                      icon={<Download className="h-4 w-4" />}
                    />
                    <IconButton
                      label={`Enviar recibo a ${line.employee.name}`}
                      onClick={() =>
                        toast.info(
                          "Envío simulado; no se contactó al empleado.",
                        )
                      }
                      icon={<Send className="h-4 w-4" />}
                    />
                  </div>
                </div>
              );
            })}
            {!visibleLines.length && (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <UserRound className="h-8 w-8 text-[color:var(--text-muted)]" />
                <p className="mt-3 text-sm font-semibold">
                  No encontramos empleados
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  Modifica la búsqueda para mostrar otros recibos.
                </p>
              </div>
            )}
          </div>
          {visibleLines.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-[color:var(--border-color)] bg-[color:var(--accent-hover)]/10 px-4 py-2.5 text-[10px] sm:flex-row sm:items-center sm:justify-between">
              <p>
                Mostrando{" "}
                <strong>
                  {visibleStart}–{visibleEnd}
                </strong>{" "}
                de <strong>{visibleLines.length}</strong> recibos · página{" "}
                {currentPage} de {totalPages}
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
                    aria-label="Recibos por página"
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
      <ReceiptPreview preview={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

function PeriodSelector({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ start: string; label: string }>;
}) {
  return (
    <div className="w-full max-w-md space-y-2">
      <Label>Periodo</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((item) => (
            <SelectItem key={item.start} value={item.start}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DecisionBadge({
  status,
}: {
  status: "PENDING" | "AUTHORIZED" | "CLARIFICATION" | undefined;
}) {
  const style =
    status === "AUTHORIZED"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
      : status === "CLARIFICATION"
        ? "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
        : "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200";
  return (
    <Badge variant="outline" className={style}>
      {status === "AUTHORIZED"
        ? "APROBADO POR USUARIO"
        : status === "CLARIFICATION"
          ? "ACLARACIÓN"
          : "PENDIENTE DE USUARIO"}
    </Badge>
  );
}

function Metric({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--accent-hover)] text-[color:var(--text-secondary)]">
          {icon}
        </span>
        <div>
          <p className="label-caps">{label}</p>
          <p className="number-display mt-1 text-xl">{value}</p>
          {note && (
            <p className="text-[10px] text-[color:var(--text-muted)]">{note}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Summary({
  label,
  value,
  large = false,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--border-color)] p-4">
      <p className="label-caps">{label}</p>
      <p
        className={
          large ? "number-display mt-1 text-2xl" : "mt-2 text-sm font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-8 w-8"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {icon}
    </Button>
  );
}

function ReceiptPreview({
  preview,
  onClose,
}: {
  preview: {
    line: EmployeePayrollLine;
    period: { start: string; end: string };
  } | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={Boolean(preview)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vista previa del recibo</DialogTitle>
          <DialogDescription>
            Documento informativo generado desde el estado mock actual.
          </DialogDescription>
        </DialogHeader>
        {preview && (
          <Receipt
            line={preview.line}
            periodStart={preview.period.start}
            periodEnd={preview.period.end}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
