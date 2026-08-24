import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgePercent,
  BarChart3,
  Boxes,
  Building2,
  CheckCircle2,
  Clock3,
  FileDown,
  FileSpreadsheet,
  FlaskConical,
  Gift,
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
  Store,
  TrendingUp,
  UserRound,
  WalletCards,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
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
  BranchInventory,
  CashExpense,
  InventoryAuditLine,
  InventoryCountAudit,
  InventoryMovement,
  MasterUser,
  PosDaySession,
  PosSessionUser,
  Product,
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

interface PosLoginScreenProps {
  companyName: string;
  branches: string[];
  fixedBranch: string;
  masterUser: MasterUser;
  sellers: Seller[];
  onLogin: (credentials: {
    company: string;
    username: string;
    password: string;
    requestedBranch: string;
  }) => string | null;
}

export function PosLoginScreen({
  companyName,
  branches,
  fixedBranch,
  masterUser,
  sellers,
  onLogin,
}: PosLoginScreenProps) {
  const [now, setNow] = useState(new Date());
  const [company, setCompany] = useState(companyName);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [branch, setBranch] = useState(fixedBranch);
  const [error, setError] = useState("");
  const normalizedUser = username.trim().toLocaleLowerCase("es-MX");
  const looksMaster =
    normalizedUser === "master" ||
    normalizedUser === masterUser.id.toLocaleLowerCase("es-MX") ||
    normalizedUser === masterUser.name.toLocaleLowerCase("es-MX");

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const submit = () => {
    const result = onLogin({
      company,
      username,
      password,
      requestedBranch: looksMaster ? branch : fixedBranch,
    });
    setError(result ?? "");
  };

  return (
    <main className="software-login-screen">
      <section className="software-login-visual">
        <div className="software-login-orbit" aria-hidden="true"><i /><i /><i /></div>
        <span className="software-suite-mark"><Boxes size={22} /> RETAIL OPERATIONS SUITE</span>
        <div className="software-clock">
          <strong>{clockFormatter.format(now)}</strong>
          <span>{dateFormatter.format(now)}</span>
        </div>
        <div className="software-login-summary">
          <span><ShieldCheck size={17} /> Sesión protegida por usuario y sucursal</span>
          <span><ScanLine size={17} /> Auditoría de inventario al abrir y cerrar</span>
          <span><Clock3 size={17} /> El primer acceso registra asistencia</span>
        </div>
      </section>

      <section className="software-login-form-panel">
        <div className="software-login-form">
          <span className="section-kicker">ACCESO AL SISTEMA</span>
          <h1>Iniciar jornada</h1>
          <p>Identifica la empresa, tu usuario y la terminal donde operarás hoy.</p>

          <div className="field-stack">
            <Label>Nombre de la empresa</Label>
            <div className="software-login-input"><Building2 size={17} /><Input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Empresa" /></div>
          </div>
          <div className="field-stack">
            <Label>Usuario</Label>
            <div className="software-login-input"><UserRound size={17} /><Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Nombre o usuario" autoComplete="username" /></div>
          </div>
          <div className="field-stack">
            <Label>Contraseña o código</Label>
            <div className="software-login-input"><KeyRound size={17} /><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Código de acceso" autoComplete="current-password" onKeyDown={(event) => { if (event.key === "Enter") submit(); }} /></div>
          </div>

          {looksMaster ? (
            <div className="field-stack">
              <Label>Sucursal de trabajo · acceso master</Label>
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
              <span><small>SUCURSAL FIJA DE ESTA COMPUTADORA</small><strong>{fixedBranch}</strong></span>
              <LockKeyhole size={15} />
            </div>
          )}

          {error && <div className="software-login-error"><AlertTriangle size={16} /> {error}</div>}
          <Button type="button" className="software-login-submit" onClick={submit} disabled={!company.trim() || !username.trim() || !password.trim()}>
            Iniciar sesión <ArrowRight size={17} />
          </Button>
          <small className="software-login-demo">
            Pruebas: <b>{masterUser.name}</b> / <b>{masterUser.accessCode}</b>
            {sellers.filter((seller) => seller.active).slice(0, 1).map((seller) => ` · ${seller.name} / ${seller.accessCode}`)}
          </small>
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
  onComplete,
}: InventoryCountScreenProps) {
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const counted = products.filter((product) => counts[product.id] !== undefined && counts[product.id] !== "").length;
  const allCounted = counted === products.length;
  const differences = products.filter((product) => {
    const value = counts[product.id];
    return value !== undefined && value !== "" && Number(value) !== (expectedStock[product.id] ?? 0);
  }).length;

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
      <header className="inventory-count-header">
        <div>
          <span className="section-kicker">{mode === "OPENING" ? "APERTURA DE JORNADA" : "AUDITORÍA PREVIA AL CORTE"}</span>
          <h1>{mode === "OPENING" ? "Conteo inicial de inventario" : "Conteo final de inventario"}</h1>
          <p>{branch} · {user.name} · Captura la existencia física de cada producto.</p>
        </div>
        <div className="inventory-count-progress">
          <strong>{counted}/{products.length}</strong>
          <span>productos contados</span>
          <i><b style={{ width: `${products.length > 0 ? (counted / products.length) * 100 : 0}%` }} /></i>
        </div>
      </header>

      <div className="inventory-count-legend">
        {showDifferences ? (
          <>
            <span><i className="is-match" /> Coincide con sistema</span>
            <span><i className="is-error" /> Diferencia de inventario</span>
            {differences > 0 && <Badge variant="outline">{differences} diferencias detectadas</Badge>}
          </>
        ) : (
          <span><ShieldCheck size={15} /> Conteo ciego · las diferencias están protegidas para administración</span>
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
            <article className={`inventory-count-product ${hasValue ? (showDifferences ? (matches ? "is-match" : "is-error") : "is-recorded") : ""}`} key={product.id}>
              <img src={product.image} alt={product.name} />
              <div>
                <span>{product.family} · {product.category}</span>
                <h2>{product.name}</h2>
                <small>{product.sku}</small>
              </div>
              <div className="inventory-count-expected">
                <span>{showDifferences ? "Existencia en sistema" : "Referencia del sistema"}</span>
                <strong>{showDifferences ? expected : <LockKeyhole size={20} aria-label="Existencia protegida" />}</strong>
              </div>
              <label>
                <span>Existencia física contada</span>
                <Input type="number" min="0" step="1" value={raw ?? ""} onChange={(event) => setCounts((current) => ({ ...current, [product.id]: event.target.value }))} placeholder="0" aria-label={`Conteo real de ${product.name}`} />
              </label>
              {hasValue && (
                <div className="inventory-count-result">
                  {!showDifferences ? <PackageCheck size={17} /> : matches ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
                  <span>{!showDifferences ? "Conteo registrado" : matches ? "Conteo correcto" : `Diferencia ${actual! - expected > 0 ? "+" : ""}${actual! - expected}`}</span>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="inventory-count-comments">
        <div>
          <span className="section-kicker">BITÁCORA DEL CONTEO</span>
          <h2>Comentarios</h2>
          <p>Registra diferencias, productos dañados, incidencias o cualquier observación relevante {mode === "OPENING" ? "de la apertura" : "del cierre"}.</p>
        </div>
        <Textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={mode === "OPENING" ? "Ej. Se recibió la sucursal con una pieza dañada…" : "Ej. La diferencia fue revisada con administración…"}
          maxLength={500}
          aria-label={`Comentarios del conteo de ${mode === "OPENING" ? "apertura" : "cierre"}`}
        />
        <small>{comment.length}/500</small>
      </section>

      <footer className="inventory-count-footer">
        <span><PackageCheck size={20} /><b>{counted}</b> productos capturados{showDifferences && <> · <b>{differences}</b> con diferencia</>}</span>
        {canSkip && (
          <Button type="button" variant="outline" onClick={() => onComplete(buildLines(), true, comment.trim())}>
            <SkipForward size={17} /> Skip count · Master
          </Button>
        )}
        <Button type="button" className="open-day-button" disabled={!allCounted} onClick={() => onComplete(buildLines(), false, comment.trim())}>
          {mode === "OPENING" ? "Open Day" : "Guardar y continuar al corte"} <ArrowRight size={17} />
        </Button>
      </footer>
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
  showInventoryDifferences,
  showCosts,
}: MasterDashboardProps) {
  const scopedTickets = tickets.filter(
    (ticket) =>
      ticket.status === "COMPLETED" &&
      (ticket.branchName ?? session.branch) === session.branch &&
      ticket.createdAtIso >= session.openedAtIso,
  );
  const scopedMovements = movements.filter(
    (movement) =>
      movement.createdAtIso >= session.openedAtIso &&
      (movement.sourceBranch === session.branch || movement.destinationBranch === session.branch),
  );
  const scopedExpenses = expenses.filter(
    (expense) =>
      expense.status === "ACTIVE" &&
      expense.branch === session.branch &&
      expense.createdAtIso >= session.openedAtIso,
  );
  const sales = scopedTickets.reduce((sum, ticket) => sum + ticket.total, 0);
  const collected = scopedTickets.reduce((sum, ticket) => sum + ticket.amountPaid, 0);
  const expenseTotal = scopedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const discountTotal = scopedTickets.reduce((sum, ticket) => sum + ticket.discountAmount, 0);
  const unitsSold = scopedTickets.reduce((sum, ticket) => sum + ticket.products.reduce((lineSum, line) => lineSum + line.quantity, 0), 0);
  const writeOffs = scopedMovements.filter((movement) => movement.direction === "REMOVE" && movement.category !== "SALE").reduce((sum, movement) => sum + movement.quantity, 0);
  const sellerRanking = Array.from(scopedTickets.flatMap((ticket) => ticket.sellerSales).reduce<Map<string, number>>((map, sale) => map.set(sale.sellerName, (map.get(sale.sellerName) ?? 0) + sale.amount), new Map()), ([name, total]) => ({ name, total })).sort((left, right) => right.total - left.total);
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
        if (movement.sourceBranch === session.branch) summary.transferOut += movement.quantity;
        if (movement.destinationBranch === session.branch) summary.transferIn += movement.quantity;
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
        <div><span className="section-kicker">CONTROL EJECUTIVO · TIEMPO REAL</span><h2>Dashboard de jornada</h2><p>{session.branch} · Abierto por {openingAudit.createdByName}</p>{showInventoryDifferences && openingAudit.comment && <small>Nota de apertura: {openingAudit.comment}</small>}{showInventoryDifferences && closingAudit?.comment && <small>Nota de cierre: {closingAudit.comment}</small>}</div>
        <Badge variant="outline">{session.status === "OPEN" ? "OPEN DAY" : "CLOSED"}</Badge>
      </section>
      <section className="master-dashboard-metrics">
        <article><ShoppingBag size={18} /><span>Venta del día</span><strong>{formatCurrency(sales)}</strong><small>{scopedTickets.length} tickets</small></article>
        <article><WalletCards size={18} /><span>Cobrado</span><strong>{formatCurrency(collected)}</strong><small>{formatCurrency(sales - collected)} pendiente</small></article>
        <article><TrendingUp size={18} /><span>Flujo después de gastos</span><strong>{formatCurrency(collected - expenseTotal)}</strong><small>-{formatCurrency(expenseTotal)} gastos</small></article>
        <article><PackageCheck size={18} /><span>Productos vendidos</span><strong>{unitsSold}</strong><small>{writeOffs} bajas adicionales</small></article>
        <article><BadgePercent size={18} /><span>Descuentos aplicados</span><strong>{formatCurrency(discountTotal)}</strong><small>Promociones y ajustes del día</small></article>
      </section>
      <section className="master-dashboard-panels">
        <Card><CardContent><div className="master-dashboard-panel-heading"><span><BarChart3 size={18} /> Venta por vendedor</span><Badge variant="outline">HOY</Badge></div><div className="master-seller-chart">{sellerRanking.map((seller) => <div key={seller.name}><span><b>{seller.name}</b><strong>{formatCurrency(seller.total)}</strong></span><i><b style={{ width: `${(seller.total / maxSeller) * 100}%` }} /></i></div>)}{sellerRanking.length === 0 && <p>Sin ventas posteriores a la apertura.</p>}</div></CardContent></Card>
        <Card><CardContent><div className="master-dashboard-panel-heading"><span><Boxes size={18} /> Movimientos de producto</span><Badge variant="outline">TIEMPO REAL</Badge></div><div className="master-movement-summary is-detailed"><span><PackagePlus size={19} /><b>Entradas</b><strong>{movementTotals.entries}</strong></span><span><ShoppingBag size={19} /><b>Ventas</b><strong>{movementTotals.sales}</strong></span><span><FlaskConical size={19} /><b>Demos</b><strong>{movementTotals.demos}</strong></span><span><PackageMinus size={19} /><b>Bajas</b><strong>{movementTotals.writeOffs}</strong></span><span><AlertTriangle size={19} /><b>Lost / Damage</b><strong>{movementTotals.lost + movementTotals.damage}</strong></span><span><Gift size={19} /><b>Gift</b><strong>{movementTotals.gifts}</strong></span><span><Boxes size={19} /><b>Transferencias</b><strong>{movementTotals.transfers}</strong></span></div></CardContent></Card>
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
