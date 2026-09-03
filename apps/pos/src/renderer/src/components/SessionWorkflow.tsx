import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  Boxes,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileDown,
  FileSpreadsheet,
  FlaskConical,
  Gift,
  HeartHandshake,
  KeyRound,
  LockKeyhole,
  Mail,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  ScanLine,
  ShieldCheck,
  ShoppingBag,
  SkipForward,
  Sparkles,
  Store,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
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
  Textarea,
} from "@cosmetics/ui";
import { formatCurrency } from "../mock-data";
import type {
  Appointment,
  BranchInventory,
  CashExpense,
  InventoryAuditLine,
  InventoryCountAudit,
  InventoryMovement,
  MasterUser,
  PosDaySession,
  PosSessionUser,
  Product,
  PaymentMethodOption,
  Seller,
  Ticket,
} from "../types";

const clockFormatter = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const dateFormatterEnglish = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Mexico_City",
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

interface PosLoginScreenProps {
  companyName: string;
  branches: string[];
  fixedBranch: string;
  masterUser: MasterUser;
  sellers: Seller[];
  language: "ES" | "EN";
  terminalManaged?: boolean;
  onLogin: (credentials: {
    company: string;
    username: string;
    password: string;
    requestedBranch: string;
  }) => Promise<string | null> | string | null;
}

export function PosLoginScreen({
  companyName,
  branches,
  fixedBranch,
  masterUser,
  sellers,
  language,
  terminalManaged = false,
  onLogin,
}: PosLoginScreenProps) {
  const english = language === "EN";
  const [now, setNow] = useState(new Date());
  const [company, setCompany] = useState(companyName);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [branch, setBranch] = useState(fixedBranch);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const normalizedUser = username.trim().toLocaleLowerCase("es-MX");
  const looksMaster =
    normalizedUser === "master" ||
    normalizedUser === masterUser.id.toLocaleLowerCase("es-MX") ||
    normalizedUser === masterUser.name.toLocaleLowerCase("es-MX");

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const result = await onLogin({
        company,
        username,
        password,
        requestedBranch: looksMaster && !terminalManaged ? branch : fixedBranch,
      });
      setError(result ?? "");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="software-login-screen">
      <section className="software-login-visual">
        <div className="software-login-orbit" aria-hidden="true"><i /><i /><i /></div>
        <span className="software-suite-mark"><Boxes size={22} /> RETAIL OPERATIONS SUITE</span>
        <div className="software-clock">
          <strong>{clockFormatter.format(now)}</strong>
          <span>{(english ? dateFormatterEnglish : dateFormatter).format(now)}</span>
        </div>
        <div className="software-login-summary">
          <span><ShieldCheck size={17} /> {english ? "Session protected by user and location" : "Sesión protegida por usuario y sucursal"}</span>
          <span><ScanLine size={17} /> {english ? "Inventory audit at opening and closing" : "Auditoría de inventario al abrir y cerrar"}</span>
          <span><Clock3 size={17} /> {english ? "First access records attendance" : "El primer acceso registra asistencia"}</span>
        </div>
      </section>

      <section className="software-login-form-panel">
        <div className="software-login-form">
          <span className="section-kicker">{english ? "SYSTEM ACCESS" : "ACCESO AL SISTEMA"}</span>
          <h1>{english ? "Start your day" : "Iniciar jornada"}</h1>
          <p>{english ? "Identify the company, your access alias and today's operating terminal." : "Identifica la empresa, tu alias de acceso y la terminal donde operarás hoy."}</p>

          <div className="field-stack">
            <Label>{english ? "Company name" : "Nombre de la empresa"}</Label>
            <div className="software-login-input"><Building2 size={17} /><Input value={company} onChange={(event) => setCompany(event.target.value)} placeholder={english ? "Company" : "Empresa"} /></div>
          </div>
          <div className="field-stack">
            <Label>{english ? "Access alias" : "Alias de acceso"}</Label>
            <div className="software-login-input"><UserRound size={17} /><Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder={english ? "Employee alias" : "Alias del vendedor"} autoComplete="username" /></div>
          </div>
          <div className="field-stack">
            <Label>{english ? "Password or code" : "Contraseña o código"}</Label>
            <div className="software-login-input"><KeyRound size={17} /><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={english ? "Access code" : "Código de acceso"} autoComplete="current-password" onKeyDown={(event) => { if (event.key === "Enter") submit(); }} /></div>
          </div>

          {looksMaster && !terminalManaged ? (
            <div className="field-stack">
              <Label>{english ? "Work location · master access" : "Sucursal de trabajo · acceso master"}</Label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {branches.map((item) => <SelectItem value={item} key={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="software-fixed-branch">
              <Store size={18} />
              <span><small>{english ? "FIXED LOCATION FOR THIS COMPUTER" : "SUCURSAL FIJA DE ESTA COMPUTADORA"}</small><strong>{fixedBranch}</strong></span>
              <LockKeyhole size={15} />
            </div>
          )}

          {error && <div className="software-login-error"><AlertTriangle size={16} /> {error}</div>}
          <Button type="button" className="software-login-submit" onClick={() => void submit()} disabled={submitting || !company.trim() || !username.trim() || !password.trim()}>
            {submitting ? (english ? "Signing in..." : "Iniciando sesión...") : (english ? "Sign in" : "Iniciar sesión")} <ArrowRight size={17} />
          </Button>
          {!terminalManaged && (
            <small className="software-login-demo">
              {english ? "Demo data mode" : "Modo de datos demostrativos"}
            </small>
          )}
        </div>
      </section>
    </main>
  );
}

interface InventoryCountScreenProps {
  mode: "OPENING" | "CLOSING";
  branch: string;
  user: PosSessionUser;
  products: Product[];
  expectedStock: Record<string, number>;
  canSkip: boolean;
  showDifferences: boolean;
  language: "ES" | "EN";
  onBack?: () => void;
  onComplete: (lines: InventoryAuditLine[], skipped: boolean, comment: string) => void;
}

export function InventoryCountScreen({
  mode,
  branch,
  user,
  products,
  expectedStock,
  canSkip,
  showDifferences,
  language,
  onBack,
  onComplete,
}: InventoryCountScreenProps) {
  const english = language === "EN";
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const counted = products.filter((product) => counts[product.id] !== undefined && counts[product.id] !== "").length;
  const allCounted = counted === products.length;
  const differences = products.filter((product) => {
    const value = counts[product.id];
    return value !== undefined && value !== "" && Number(value) !== (expectedStock[product.id] ?? 0);
  }).length;
  const correctCounts = counted - differences;
  const countedPercentage = products.length > 0 ? Math.round((counted / products.length) * 100) : 0;
  const correctPercentage = products.length > 0 ? Math.round((correctCounts / products.length) * 100) : 0;
  const errorPercentage = products.length > 0 ? Math.round((differences / products.length) * 100) : 0;

  const buildLines = () =>
    products.map((product) => {
      const expected = expectedStock[product.id] ?? 0;
      const actual = Number(counts[product.id] ?? expected);
      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        image: product.image,
        expectedStock: expected,
        actualStock: actual,
        difference: actual - expected,
      };
    });

  return (
    <main className="inventory-count-screen">
      {mode === "CLOSING" && onBack && (
        <Button
          type="button"
          variant="outline"
          className="inventory-count-back-button"
          onClick={onBack}
        >
          <ArrowLeft size={16} /> Regresar al menú
        </Button>
      )}
      <header className="inventory-count-header">
        <div>
          <span className="section-kicker">{mode === "OPENING" ? (english ? "DAY OPENING" : "APERTURA DE JORNADA") : (english ? "PRE-CLOSING AUDIT" : "AUDITORÍA PREVIA AL CORTE")}</span>
          <h1>{mode === "OPENING" ? (english ? "Opening inventory count" : "Conteo inicial de inventario") : (english ? "Closing inventory count" : "Conteo final de inventario")}</h1>
          <p>{branch} · {user.name} · {english ? "Enter the physical quantity of each product." : "Captura la existencia física de cada producto."}</p>
        </div>
        <div className="inventory-count-progress">
          <strong>{counted}/{products.length}</strong>
          <span>{english ? "products counted" : "productos contados"}</span>
          <i><b style={{ width: `${countedPercentage}%` }} /></i>
          <div className="inventory-count-progress-bars">
            <div className="inventory-count-quality is-correct">
              <span>
                <b>{english ? "Correct count" : "Conteo correcto"}</b>
                <strong>{correctPercentage}%</strong>
              </span>
              <i
                role="progressbar"
                aria-label={english ? "Correct count percentage" : "Porcentaje de conteo correcto"}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={correctPercentage}
              >
                <b style={{ width: `${correctPercentage}%` }} />
              </i>
            </div>
            <div className="inventory-count-quality is-error">
              <span>
                <b>{english ? "Count error" : "Error en conteo"}</b>
                <strong>{errorPercentage}%</strong>
              </span>
              <i
                role="progressbar"
                aria-label={english ? "Count error percentage" : "Porcentaje de error en conteo"}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={errorPercentage}
              >
                <b style={{ width: `${errorPercentage}%` }} />
              </i>
            </div>
          </div>
        </div>
      </header>

      <div className="inventory-count-legend">
        {showDifferences ? (
          <>
            <span><i className="is-match" /> {english ? "Matches system" : "Coincide con sistema"}</span>
            <span><i className="is-error" /> {english ? "Inventory difference" : "Diferencia de inventario"}</span>
            {differences > 0 && (
              <Badge variant="outline">
                {differences}{" "}
                {english
                  ? differences === 1 ? "difference detected" : "differences detected"
                  : differences === 1 ? "diferencia detectada" : "diferencias detectadas"}
              </Badge>
            )}
          </>
        ) : (
          <span><ShieldCheck size={15} /> {english ? "Blind count · differences are protected for administration" : "Conteo ciego · las diferencias están protegidas para administración"}</span>
        )}
      </div>

      <section className="inventory-count-grid">
        {products.map((product) => {
          const expected = expectedStock[product.id] ?? 0;
          const raw = counts[product.id];
          const hasValue = raw !== undefined && raw !== "";
          const actual = hasValue ? Number(raw) : null;
          const matches = actual === expected;
          return (
            <article className={`inventory-count-product ${hasValue ? (matches ? "is-match" : "is-error") : ""}`} key={product.id}>
              <img src={product.image} alt={product.name} />
              <div>
                <span>{product.family} · {product.category}</span>
                <h2>{product.name}</h2>
                <small>{product.sku}</small>
              </div>
              <div className="inventory-count-expected">
                <span>{showDifferences ? (english ? "System stock" : "Existencia en sistema") : (english ? "System reference" : "Referencia del sistema")}</span>
                <strong>{showDifferences ? expected : <LockKeyhole size={20} aria-label={english ? "Protected stock" : "Existencia protegida"} />}</strong>
              </div>
              <label>
                <span>{english ? "Physical quantity counted" : "Existencia física contada"}</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={raw ?? ""}
                  onChange={(event) => {
                    const value = event.target.value.replace(/\D/g, "");
                    setCounts((current) => ({
                      ...current,
                      [product.id]: value,
                    }));
                  }}
                  aria-label={`${english ? "Actual count for" : "Conteo real de"} ${product.name}`}
                />
              </label>
              {hasValue && (
                <div className="inventory-count-result">
                  {matches ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  <span>
                    {matches
                      ? english ? "Correct count" : "Conteo correcto"
                      : showDifferences
                        ? `${english ? "Difference" : "Diferencia"} ${actual! - expected > 0 ? "+" : ""}${actual! - expected}`
                        : english ? "Review your inventory or count the product again." : "Revisa tu inventario o vuelve a contar tu producto."}
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="inventory-count-comments">
        <div>
          <span className="section-kicker">{english ? "COUNT LOG" : "BITÁCORA DEL CONTEO"}</span>
          <h2>{english ? "Comments" : "Comentarios"}</h2>
          <p>{english ? `Record differences, damaged products, incidents or any relevant ${mode === "OPENING" ? "opening" : "closing"} observation.` : `Registra diferencias, productos dañados, incidencias o cualquier observación relevante ${mode === "OPENING" ? "de la apertura" : "del cierre"}.`}</p>
        </div>
        <Textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={mode === "OPENING" ? (english ? "E.g. The location received one damaged item…" : "Ej. Se recibió la sucursal con una pieza dañada…") : (english ? "E.g. The difference was reviewed with administration…" : "Ej. La diferencia fue revisada con administración…")}
          maxLength={500}
          aria-label={english ? `${mode === "OPENING" ? "Opening" : "Closing"} count comments` : `Comentarios del conteo de ${mode === "OPENING" ? "apertura" : "cierre"}`}
        />
        <small>{comment.length}/500</small>
      </section>

      <footer className="inventory-count-footer">
        <span><PackageCheck size={20} /><b>{counted}</b> {english ? "products entered" : "productos capturados"}{showDifferences && <> · <b>{differences}</b> {english ? "with differences" : "con diferencia"}</>}</span>
        {canSkip && (
          <Button type="button" variant="outline" onClick={() => onComplete(buildLines(), true, comment.trim())}>
            <SkipForward size={17} /> Skip count · Master
          </Button>
        )}
        <Button type="button" className="open-day-button" disabled={!allCounted} onClick={() => setConfirmationOpen(true)}>
          {mode === "OPENING" ? "Open Day" : english ? "Save and continue to closing" : "Guardar y continuar al corte"} <ArrowRight size={17} />
        </Button>
      </footer>

      <Dialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <DialogContent className="inventory-count-confirmation sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{english ? "Are you sure you want to submit this data?" : "¿Estás seguro de enviar estos datos?"}</DialogTitle>
            <DialogDescription>
              {english ? `This will be the first saved ${mode === "OPENING" ? "opening" : "closing"} count. Review all quantities before continuing.` : <>Este será el primer guardado del conteo de {mode === "OPENING" ? "apertura" : "cierre"}. Revisa las cantidades antes de continuar.</>}
            </DialogDescription>
          </DialogHeader>
          <div className="inventory-count-confirmation-summary">
            <PackageCheck size={22} />
            <span>
              <strong>{counted} {english ? "products entered" : "productos capturados"}</strong>
              <small>
                {showDifferences
                  ? `${differences} ${english ? "differences detected for audit." : "diferencias detectadas para auditoría."}`
                  : english ? "Numeric differences will remain protected for administration." : "Las diferencias numéricas permanecerán protegidas para administración."}
              </small>
            </span>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmationOpen(false)}>
              {english ? "Review again" : "Volver a revisar"}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setConfirmationOpen(false);
                onComplete(buildLines(), false, comment.trim());
              }}
            >
              <ShieldCheck size={16} /> {english ? "Confirm and submit" : "Confirmar y enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

interface MasterDashboardProps {
  session: PosDaySession;
  openingAudit: InventoryCountAudit;
  closingAudit: InventoryCountAudit | null;
  products: Product[];
  branchInventory: BranchInventory;
  movements: InventoryMovement[];
  tickets: Ticket[];
  expenses: CashExpense[];
  appointments: Appointment[];
  paymentMethods: PaymentMethodOption[];
  availableBranches: string[];
  canViewAllBranches: boolean;
  showInventoryDifferences: boolean;
  showCosts: boolean;
}

export function MasterDashboard({
  session,
  openingAudit,
  closingAudit,
  products,
  branchInventory,
  movements,
  tickets,
  expenses,
  appointments,
  paymentMethods,
  availableBranches,
  canViewAllBranches,
  showInventoryDifferences,
  showCosts,
}: MasterDashboardProps) {
  const [dashboardBranch, setDashboardBranch] = useState(canViewAllBranches ? "ALL" : session.branch);
  useEffect(() => {
    if (!canViewAllBranches) setDashboardBranch(session.branch);
  }, [canViewAllBranches, session.branch]);
  const scopedBranch = canViewAllBranches ? dashboardBranch : session.branch;
  const scopeLabel = scopedBranch === "ALL" ? "Todas las sucursales" : scopedBranch;
  const businessDate = (iso: string) => new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
  const sessionBusinessDate = businessDate(session.openedAtIso);
  const matchesScope = (branch: string | null | undefined) => scopedBranch === "ALL" || (branch ?? session.branch) === scopedBranch;
  const scopedTickets = tickets.filter(
    (ticket) =>
      ticket.status === "COMPLETED" &&
      matchesScope(ticket.branchName) &&
      businessDate(ticket.createdAtIso) === sessionBusinessDate,
  );
  const scopedMovements = movements.filter(
    (movement) =>
      businessDate(movement.createdAtIso) === sessionBusinessDate &&
      (scopedBranch === "ALL" || movement.sourceBranch === scopedBranch || movement.destinationBranch === scopedBranch),
  );
  const scopedExpenses = expenses.filter(
    (expense) =>
      expense.status === "ACTIVE" &&
      matchesScope(expense.branch) &&
      businessDate(expense.createdAtIso) === sessionBusinessDate,
  );
  const scopedAppointments = appointments.filter(
    (appointment) =>
      matchesScope(appointment.branch) &&
      (businessDate(appointment.recordedAtIso) === sessionBusinessDate || appointment.date === sessionBusinessDate),
  );
  const sales = scopedTickets.reduce((sum, ticket) => sum + ticket.total, 0);
  const collected = scopedTickets.reduce((sum, ticket) => sum + ticket.amountPaid, 0);
  const expenseTotal = scopedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const discountTotal = scopedTickets.reduce((sum, ticket) => sum + ticket.discountAmount, 0);
  const unitsSold = scopedTickets.reduce((sum, ticket) => sum + ticket.products.reduce((lineSum, line) => lineSum + line.quantity, 0), 0);
  const writeOffs = scopedMovements.filter((movement) => movement.direction === "REMOVE" && movement.category !== "SALE").reduce((sum, movement) => sum + movement.quantity, 0);
  const sellerRanking = Array.from(scopedTickets.flatMap((ticket) => ticket.sellerSales).reduce<Map<string, number>>((map, sale) => map.set(sale.sellerName, (map.get(sale.sellerName) ?? 0) + sale.amount), new Map()), ([name, total]) => ({ name, total })).sort((left, right) => right.total - left.total);
  const serviceSales = Array.from(scopedTickets.reduce<Map<string, { name: string; quantity: number; total: number }>>((summary, ticket) => {
    ticket.products.forEach((line) => {
      const product = products.find((candidate) => candidate.id === line.productId);
      if (product?.kind !== "SERVICE" || line.name.endsWith(" · REGALO")) return;
      const current = summary.get(line.productId) ?? { name: line.name, quantity: 0, total: 0 };
      summary.set(line.productId, { ...current, quantity: current.quantity + line.quantity, total: current.total + line.total });
    });
    return summary;
  }, new Map()).values()).sort((left, right) => right.total - left.total);
  const paymentTotals = Array.from(scopedTickets.reduce<Map<string, number>>((summary, ticket) => {
    const entries = ticket.payments.length > 0
      ? ticket.payments
      : [{ id: `fallback-${ticket.id}`, methodId: ticket.paymentMethod, amount: ticket.amountPaid }];
    entries.forEach((payment) => summary.set(payment.methodId, (summary.get(payment.methodId) ?? 0) + payment.amount));
    return summary;
  }, new Map()), ([methodId, total]) => ({
    methodId,
    label: paymentMethods.find((method) => method.id === methodId)?.label ?? methodId,
    total,
  })).sort((left, right) => right.total - left.total);
  const courtesyAppointments = scopedAppointments.filter((appointment) => appointment.kind === "COURTESY");
  const nextSessionAppointments = scopedAppointments.filter((appointment) => appointment.kind === "NEXT_SESSION");
  const missingAppointments = scopedAppointments.filter((appointment) => appointment.kind === "NO_APPOINTMENT");
  const appointmentServices = Array.from(scopedAppointments.filter((appointment) => appointment.kind !== "NO_APPOINTMENT").reduce<Map<string, number>>((summary, appointment) => {
    summary.set(appointment.service, (summary.get(appointment.service) ?? 0) + 1);
    return summary;
  }, new Map()), ([name, quantity]) => ({ name, quantity })).sort((left, right) => right.quantity - left.quantity);
  const inventoryRows = openingAudit.lines.map((line) => {
    const productMovements = scopedMovements.filter((movement) => movement.productId === line.productId);
    const movementNet = productMovements.reduce((net, movement) => {
      if (movement.direction === "ADD" && movement.sourceBranch === session.branch) return net + movement.quantity;
      if (movement.direction === "REMOVE" && movement.sourceBranch === session.branch) return net - movement.quantity;
      if (movement.direction === "TRANSFER") {
        if (movement.sourceBranch === session.branch) net -= movement.quantity;
        if (movement.destinationBranch === session.branch) net += movement.quantity;
      }
      return net;
    }, 0);
    const operation = productMovements.reduce((summary, movement) => {
      const reason = `${movement.reason} ${movement.comment}`.toLocaleLowerCase("es-MX");
      if (movement.direction === "ADD") summary.entries += movement.quantity;
      else if (movement.direction === "TRANSFER") {
        if (scopedBranch === "ALL") summary.transferOut += movement.quantity;
        else {
          if (movement.sourceBranch === scopedBranch) summary.transferOut += movement.quantity;
          if (movement.destinationBranch === scopedBranch) summary.transferIn += movement.quantity;
        }
      } else if (movement.category === "SALE" || reason.includes("venta")) summary.sales += movement.quantity;
      else if (movement.category === "DEMO" || reason.includes("tester") || reason.includes("demo")) summary.demos += movement.quantity;
      else if (reason.includes("lost") || reason.includes("perd")) summary.lost += movement.quantity;
      else if (reason.includes("damage") || reason.includes("dañ")) summary.damage += movement.quantity;
      else if (reason.includes("gift") || reason.includes("regalo") || reason.includes("cortesía")) summary.gifts += movement.quantity;
      else summary.writeOffs += movement.quantity;
      return summary;
    }, { entries: 0, sales: 0, demos: 0, writeOffs: 0, lost: 0, damage: 0, gifts: 0, transferIn: 0, transferOut: 0 });
    const expectedCurrent = line.actualStock + movementNet;
    const realCurrent = branchInventory[session.branch]?.[line.productId] ?? 0;
    const closingLine = closingAudit?.lines.find((item) => item.productId === line.productId);
    const auditDifference = closingLine
      ? closingLine.difference
      : line.difference !== 0
        ? line.difference
        : realCurrent - expectedCurrent;
    const hasError = line.difference !== 0 || auditDifference !== 0;
    const product = products.find((candidate) => candidate.id === line.productId);
    return {
      ...line,
      movementNet,
      expectedCurrent,
      realCurrent,
      closingLine,
      auditDifference,
      hasError,
      operation,
      unitCostMxn: product?.costMxn ?? 0,
      unitCostUsd: product?.costUsd ?? 0,
    };
  });
  const errorRows = showInventoryDifferences ? inventoryRows.filter((row) => row.hasError) : [];
  const maxSeller = Math.max(1, ...sellerRanking.map((seller) => seller.total));
  const movementTotals = inventoryRows.reduce((summary, row) => ({
    entries: summary.entries + row.operation.entries,
    sales: summary.sales + row.operation.sales,
    demos: summary.demos + row.operation.demos,
    writeOffs: summary.writeOffs + row.operation.writeOffs,
    lost: summary.lost + row.operation.lost,
    damage: summary.damage + row.operation.damage,
    gifts: summary.gifts + row.operation.gifts,
    transfers: summary.transfers + row.operation.transferIn + row.operation.transferOut,
  }), { entries: 0, sales: 0, demos: 0, writeOffs: 0, lost: 0, damage: 0, gifts: 0, transfers: 0 });

  const buildErrorExportRows = () => errorRows.map((row) => ({
    Sucursal: session.branch,
    Producto: row.productName,
    SKU: row.sku,
    "Conteo de apertura": row.actualStock,
    "Esperado actual": row.expectedCurrent,
    "Existencia real": row.realCurrent,
    "Diferencia": row.auditDifference,
    Ventas: row.operation.sales,
    Demos: row.operation.demos,
    Bajas: row.operation.writeOffs,
    Lost: row.operation.lost,
    Damage: row.operation.damage,
    Gift: row.operation.gifts,
    Entradas: row.operation.entries,
    Transferencias: row.operation.transferIn + row.operation.transferOut,
    ...(showCosts ? {
      "Costo unitario MXN": row.unitCostMxn,
      "Costo unitario USD": row.unitCostUsd,
      "Impacto diferencia MXN": row.auditDifference * row.unitCostMxn,
      "Impacto diferencia USD": row.auditDifference * row.unitCostUsd,
    } : {}),
  }));

  const exportErrorsExcel = async () => {
    if (errorRows.length === 0) return;
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(buildErrorExportRows());
    worksheet["!cols"] = Object.keys(buildErrorExportRows()[0] ?? {}).map((header) => ({ wch: Math.max(14, Math.min(34, header.length + 4)) }));
    XLSX.utils.book_append_sheet(workbook, worksheet, "Solicitud de reconteo");
    XLSX.writeFile(workbook, `reconteo-${session.branch.toLocaleLowerCase("es-MX").replace(/\s+/g, "-")}.xlsx`);
  };

  const exportErrorsPdf = async () => {
    if (errorRows.length === 0) return;
    const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("SOLICITUD DE RECONTEO DE INVENTARIO", 36, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Sucursal: ${session.branch} · Productos con diferencia: ${errorRows.length} · Documento para validación física`, 36, 57);
    const headers = ["Producto / SKU", "Apertura", "Esperado", "Real", "Diferencia", "Ventas", "Demos", "Bajas", "Lost", "Damage", "Gift", ...(showCosts ? ["Costo MXN", "Impacto MXN"] : [])];
    autoTable(doc, {
      startY: 73,
      head: [headers],
      body: errorRows.map((row) => [
        `${row.productName}\n${row.sku}`,
        row.actualStock,
        row.expectedCurrent,
        row.realCurrent,
        row.auditDifference,
        row.operation.sales,
        row.operation.demos,
        row.operation.writeOffs,
        row.operation.lost,
        row.operation.damage,
        row.operation.gifts,
        ...(showCosts ? [formatCurrency(row.unitCostMxn), formatCurrency(row.auditDifference * row.unitCostMxn)] : []),
      ]),
      styles: { fontSize: 7, cellPadding: 4 },
      headStyles: { fillColor: [111, 79, 55] },
      alternateRowStyles: { fillColor: [249, 245, 241] },
    });
    doc.save(`reconteo-${session.branch.toLocaleLowerCase("es-MX").replace(/\s+/g, "-")}.pdf`);
  };

  return (
    <div className="master-dashboard-view">
      <section className="master-dashboard-hero">
        <div><span className="section-kicker">CONTROL EJECUTIVO · TIEMPO REAL</span><h2>Dashboard de jornada</h2><p>{scopeLabel} · Abierto por {openingAudit.createdByName}</p>{showInventoryDifferences && openingAudit.comment && <small>Nota de apertura: {openingAudit.comment}</small>}{showInventoryDifferences && closingAudit?.comment && <small>Nota de cierre: {closingAudit.comment}</small>}</div>
        <div className="dashboard-scope-control">
          {canViewAllBranches ? <><span>ALCANCE MASTER</span><Select value={dashboardBranch} onValueChange={setDashboardBranch}><SelectTrigger aria-label="Alcance del dashboard"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">General · todas las sucursales</SelectItem>{availableBranches.map((branch) => <SelectItem value={branch} key={branch}>{branch}</SelectItem>)}</SelectContent></Select></> : <Badge variant="outline"><Store size={13} /> Sucursal fija · {session.branch}</Badge>}
          <Badge variant="outline">{session.status === "OPEN" ? "OPEN DAY" : "CLOSED"}</Badge>
        </div>
      </section>
      <section className="master-dashboard-metrics">
        <article><ShoppingBag size={18} /><span>Venta del día</span><strong>{formatCurrency(sales)}</strong><small>{scopedTickets.length} tickets</small></article>
        <article><WalletCards size={18} /><span>Cobrado</span><strong>{formatCurrency(collected)}</strong><small>{formatCurrency(sales - collected)} pendiente</small></article>
        <article><TrendingUp size={18} /><span>Flujo después de gastos</span><strong>{formatCurrency(collected - expenseTotal)}</strong><small>-{formatCurrency(expenseTotal)} gastos</small></article>
        <article><PackageCheck size={18} /><span>Productos vendidos</span><strong>{unitsSold}</strong><small>{writeOffs} bajas adicionales</small></article>
        <article><BadgePercent size={18} /><span>Descuentos aplicados</span><strong>{formatCurrency(discountTotal)}</strong><small>Promociones y ajustes del día</small></article>
      </section>
      <section className="master-dashboard-panels">
        <Card><CardContent><div className="master-dashboard-panel-heading"><span><UsersRound size={18} /> Venta y distribución por vendedor</span><Badge variant="outline">{scopeLabel}</Badge></div><div className="master-seller-chart">{sellerRanking.map((seller) => <div key={seller.name}><span><b>{seller.name}</b><strong>{formatCurrency(seller.total)} · {sales > 0 ? ((seller.total / sales) * 100).toFixed(1) : "0.0"}%</strong></span><i><b style={{ width: `${(seller.total / maxSeller) * 100}%` }} /></i></div>)}{sellerRanking.length === 0 && <p>Sin ventas registradas en el alcance seleccionado.</p>}</div></CardContent></Card>
        <Card><CardContent><div className="master-dashboard-panel-heading"><span><Boxes size={18} /> Movimientos de producto</span><Badge variant="outline">TIEMPO REAL</Badge></div><div className="master-movement-summary is-detailed"><span><PackagePlus size={19} /><b>Entradas</b><strong>{movementTotals.entries}</strong></span><span><ShoppingBag size={19} /><b>Ventas</b><strong>{movementTotals.sales}</strong></span><span><FlaskConical size={19} /><b>Demos</b><strong>{movementTotals.demos}</strong></span><span><PackageMinus size={19} /><b>Bajas</b><strong>{movementTotals.writeOffs}</strong></span><span><AlertTriangle size={19} /><b>Lost / Damage</b><strong>{movementTotals.lost + movementTotals.damage}</strong></span><span><Gift size={19} /><b>Gift</b><strong>{movementTotals.gifts}</strong></span><span><Boxes size={19} /><b>Transferencias</b><strong>{movementTotals.transfers}</strong></span></div></CardContent></Card>
      </section>
      <section className="dashboard-operational-reports">
        <Card><CardContent><div className="master-dashboard-panel-heading"><span><Sparkles size={18} /> Servicios vendidos y cortesías</span><Badge variant="outline">{serviceSales.reduce((sum, service) => sum + service.quantity, 0)} SERVICIOS</Badge></div><div className="dashboard-report-kpis"><span><strong>{formatCurrency(serviceSales.reduce((sum, service) => sum + service.total, 0))}</strong><small>Venta de servicios</small></span><span><strong>{courtesyAppointments.length}</strong><small>Cortesías registradas</small></span></div><div className="dashboard-report-list">{serviceSales.map((service) => <div key={service.name}><span><b>{service.name}</b><small>{service.quantity} vendidos</small></span><strong>{formatCurrency(service.total)}</strong></div>)}{serviceSales.length === 0 && <p>Sin servicios vendidos en el alcance seleccionado.</p>}{courtesyAppointments.map((appointment) => <div className="is-courtesy" key={appointment.id}><span><b>{appointment.service}</b><small>{appointment.clientName} · {appointment.branch}</small></span><strong>REGALO</strong></div>)}</div></CardContent></Card>
        <Card><CardContent><div className="master-dashboard-panel-heading"><span><CalendarDays size={18} /> Citas generadas</span><Badge variant="outline">{scopedAppointments.length} REGISTROS</Badge></div><div className="dashboard-appointment-kpis"><span><HeartHandshake size={17} /><b>{courtesyAppointments.length}</b><small>Cortesías</small></span><span><CalendarDays size={17} /><b>{nextSessionAppointments.length}</b><small>Próximas</small></span><span><AlertTriangle size={17} /><b>{missingAppointments.length}</b><small>Sin cita</small></span></div><div className="dashboard-report-list">{appointmentServices.map((service) => <div key={service.name}><span><b>{service.name}</b><small>Agenda y cortesías</small></span><strong>{service.quantity}</strong></div>)}{appointmentServices.length === 0 && <p>Sin citas o cortesías generadas para este alcance.</p>}</div></CardContent></Card>
        <Card><CardContent><div className="master-dashboard-panel-heading"><span><CreditCard size={18} /> Total por método de pago</span><Badge variant="outline">{formatCurrency(paymentTotals.reduce((sum, payment) => sum + payment.total, 0))}</Badge></div><div className="dashboard-payment-list">{paymentTotals.map((payment) => <div key={payment.methodId}><span><CreditCard size={15} /><b>{payment.label}</b></span><strong>{formatCurrency(payment.total)}</strong><i><b style={{ width: `${collected > 0 ? Math.min(100, (payment.total / collected) * 100) : 0}%` }} /></i><small>{collected > 0 ? ((payment.total / collected) * 100).toFixed(1) : "0.0"}% del cobro</small></div>)}{paymentTotals.length === 0 && <p>Sin cobros registrados en el alcance seleccionado.</p>}</div></CardContent></Card>
      </section>
      <Card className="master-inventory-audit-card"><CardContent>
        <div className="master-dashboard-panel-heading master-audit-heading">
          <span><ScanLine size={19} /> Conteo y trazabilidad de inventario</span>
          <div>
            {showInventoryDifferences ? <Badge variant="outline" className={errorRows.length > 0 ? "is-error" : ""}>{errorRows.length} CON ERROR</Badge> : <Badge variant="outline"><LockKeyhole size={12} /> INVENTARIO REAL PROTEGIDO</Badge>}
            {showInventoryDifferences && <Button type="button" size="sm" variant="outline" disabled={errorRows.length === 0} onClick={() => void exportErrorsExcel()}><FileSpreadsheet size={15} /> Excel errores</Button>}
            {showInventoryDifferences && <Button type="button" size="sm" variant="outline" disabled={errorRows.length === 0} onClick={() => void exportErrorsPdf()}><FileDown size={15} /> PDF errores</Button>}
          </div>
        </div>
        <p className="master-audit-copy">{showInventoryDifferences ? "Vista autorizada: compara conteo físico, existencia real y diferencias. Las descargas generan una solicitud de reconteo para la sucursal." : "Vista operativa: muestra exclusivamente conteos registrados y movimientos generados en tiempo real. La existencia física, diferencias y costos permanecen protegidos."}</p>
        {showInventoryDifferences && errorRows.length > 0 && <div className="master-recount-share"><Mail size={17} /><span><strong>Archivo listo para compartir con {session.branch}</strong><small>Descarga únicamente los productos con error para solicitar por correo un nuevo conteo y validar la existencia física.</small></span></div>}
        <div className={`master-audit-table ${showInventoryDifferences ? "is-authorized" : "is-operational"}`}>
          {showInventoryDifferences ? (
            <table><thead><tr><th>Producto</th><th>Sistema apertura</th><th>Conteo apertura</th><th>Movimientos</th><th>Esperado actual</th><th>Existencia real</th><th>Cierre contado</th><th>Diferencia</th>{showCosts && <><th>Costo MXN</th><th>Impacto diferencia</th></>}</tr></thead><tbody>{inventoryRows.map((row) => <tr className={row.hasError ? "is-error" : "is-match"} key={row.productId}><td><img src={products.find((product) => product.id === row.productId)?.image ?? row.image} alt="" /><span><b>{row.productName}</b><small>{row.sku}</small></span></td><td>{row.expectedStock}</td><td>{row.actualStock}</td><td>{row.movementNet > 0 ? "+" : ""}{row.movementNet}</td><td>{row.expectedCurrent}</td><td><strong>{row.realCurrent}</strong></td><td>{row.closingLine?.actualStock ?? "—"}</td><td><b>{row.auditDifference > 0 ? "+" : ""}{row.auditDifference}</b></td>{showCosts && <><td>{formatCurrency(row.unitCostMxn)}</td><td>{formatCurrency(row.auditDifference * row.unitCostMxn)}</td></>}</tr>)}</tbody></table>
          ) : (
            <table><thead><tr><th>Producto</th><th>Conteo</th><th>Ventas</th><th>Demos</th><th>Bajas</th><th>Lost</th><th>Damage</th><th>Gift</th><th>Entradas</th><th>Transferencias</th><th>Movimiento neto</th></tr></thead><tbody>{inventoryRows.map((row) => <tr className="is-protected" key={row.productId}><td><img src={products.find((product) => product.id === row.productId)?.image ?? row.image} alt="" /><span><b>{row.productName}</b><small>{row.sku}</small></span></td><td><Badge variant="outline">{openingAudit.skipped ? "Omitido por master" : "Registrado"}</Badge></td><td>{row.operation.sales}</td><td>{row.operation.demos}</td><td>{row.operation.writeOffs}</td><td>{row.operation.lost}</td><td>{row.operation.damage}</td><td>{row.operation.gifts}</td><td>+{row.operation.entries}</td><td>{row.operation.transferIn + row.operation.transferOut}</td><td>{row.movementNet > 0 ? "+" : ""}{row.movementNet}</td></tr>)}</tbody></table>
          )}
        </div>
      </CardContent></Card>
    </div>
  );
}
