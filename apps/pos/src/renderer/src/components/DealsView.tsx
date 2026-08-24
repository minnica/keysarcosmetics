import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarRange,
  CheckCircle2,
  Edit3,
  KeyRound,
  Lightbulb,
  LockKeyhole,
  PackageCheck,
  PackagePlus,
  Plus,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Card,
  CardContent,
  DatePicker,
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
import { formatCurrency } from "../mock-data";
import type { Product, RetailDeal, RetailDealLine, Ticket } from "../types";

interface DealsViewProps {
  deals: RetailDeal[];
  products: Product[];
  tickets: Ticket[];
  branches: string[];
  authorized: boolean;
  onAuthorize: (code: string) => boolean;
  onLock: () => void;
  onSave: (deal: RetailDeal) => void;
  onPublish: (dealId: string, code: string) => boolean;
  onDeactivate: (dealId: string) => void;
}

interface DealForm {
  id: string;
  name: string;
  sku: string;
  description: string;
  price: string;
  startDate: string;
  endDate: string;
  branches: string[];
  lines: RetailDealLine[];
  createdAtIso: string;
}

interface DealRecommendation {
  id: string;
  productIds: string[];
  productNames: string[];
  occurrences: number;
  listTotal: number;
  minimumTotal: number;
  costTotal: number;
  suggestedPrice: number;
}

const businessToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const currentMonthRange = () => {
  const today = businessToday();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start: `${today.slice(0, 7)}-01`, end };
};

const emptyForm = (branches: string[]): DealForm => {
  const range = currentMonthRange();
  return {
    id: "",
    name: "",
    sku: `DEAL-${crypto.randomUUID().slice(0, 5).toUpperCase()}`,
    description: "",
    price: "",
    startDate: range.start,
    endDate: range.end,
    branches: branches[0] ? [branches[0]] : [],
    lines: [],
    createdAtIso: new Date().toISOString(),
  };
};

const getBusinessDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));

const getDealTotals = (deal: Pick<RetailDeal, "lines">, products: Product[]) =>
  deal.lines.reduce(
    (totals, line) => {
      const product = products.find((candidate) => candidate.id === line.productId);
      if (!product) return totals;
      totals.list += product.maxPrice * line.quantity;
      totals.minimum += product.minPrice * line.quantity;
      totals.costMxn += product.costMxn * line.quantity;
      totals.costUsd += product.costUsd * line.quantity;
      return totals;
    },
    { list: 0, minimum: 0, costMxn: 0, costUsd: 0 },
  );

const statusLabels: Record<RetailDeal["status"], string> = {
  DRAFT: "BORRADOR",
  PUBLISHED: "PUBLICADO",
  INACTIVE: "INACTIVO",
};

export function DealsView({
  deals,
  products,
  tickets,
  branches,
  authorized,
  onAuthorize,
  onLock,
  onSave,
  onPublish,
  onDeactivate,
}: DealsViewProps) {
  const [accessCode, setAccessCode] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<DealForm>(() => emptyForm(branches));
  const [publishDeal, setPublishDeal] = useState<RetailDeal | null>(null);
  const [publishCode, setPublishCode] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const currentMonth = businessToday().slice(0, 7);
  const activeProducts = products.filter((product) => product.active);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      branches: current.branches.filter((branch) => branches.includes(branch)),
    }));
  }, [branches]);

  const monthlyTickets = tickets.filter(
    (ticket) =>
      ticket.status === "COMPLETED" &&
      ticket.ticketType !== "LAYAWAY_PAYMENT" &&
      getBusinessDate(ticket.createdAtIso).startsWith(currentMonth),
  );
  const monthlyDealCount = monthlyTickets.reduce(
    (sum, ticket) =>
      sum + (ticket.deals ?? []).reduce((dealSum, deal) => dealSum + deal.quantity, 0),
    0,
  );
  const monthlyDealRevenue = monthlyTickets.reduce(
    (sum, ticket) =>
      sum + (ticket.deals ?? []).reduce((dealSum, deal) => dealSum + deal.total, 0),
    0,
  );

  const recommendations = useMemo<DealRecommendation[]>(() => {
    const combinations = new Map<string, { productIds: string[]; occurrences: number }>();
    monthlyTickets.forEach((ticket) => {
      const ids = Array.from(
        new Set(
          ticket.products
            .map((line) => line.productId)
            .filter((id) => products.some((product) => product.id === id)),
        ),
      ).sort();
      for (let first = 0; first < ids.length; first += 1) {
        for (let second = first + 1; second < ids.length; second += 1) {
          const productIds = [ids[first], ids[second]].filter(
            (id): id is string => Boolean(id),
          );
          if (productIds.length !== 2) continue;
          const key = productIds.join("::");
          const current = combinations.get(key);
          combinations.set(key, {
            productIds,
            occurrences: (current?.occurrences ?? 0) + 1,
          });
        }
      }
    });
    return Array.from(combinations.entries())
      .map(([id, combination]) => {
        const combinationProducts = combination.productIds.flatMap((id) => {
          const product = products.find((candidate) => candidate.id === id);
          return product ? [product] : [];
        });
        const listTotal = combinationProducts.reduce((sum, product) => sum + product.maxPrice, 0);
        const minimumTotal = combinationProducts.reduce((sum, product) => sum + product.minPrice, 0);
        const costTotal = combinationProducts.reduce((sum, product) => sum + product.costMxn, 0);
        const profitableFloor = costTotal > 0 ? costTotal * 1.35 : 0;
        const suggestedPrice = Math.ceil(
          Math.min(listTotal, Math.max(profitableFloor, minimumTotal * 0.92)) / 10,
        ) * 10;
        return {
          id,
          productIds: combination.productIds,
          productNames: combinationProducts.map((product) => product.name),
          occurrences: combination.occurrences,
          listTotal,
          minimumTotal,
          costTotal,
          suggestedPrice,
        };
      })
      .filter(
        (recommendation) =>
          recommendation.productIds.length === 2 &&
          recommendation.suggestedPrice >= recommendation.costTotal,
      )
      .sort(
        (left, right) =>
          right.occurrences - left.occurrences ||
          right.listTotal - left.listTotal,
      )
      .slice(0, 4);
  }, [monthlyTickets, products]);

  const authorizeModule = () => {
    if (!onAuthorize(accessCode.trim())) {
      toast.error("Código master incorrecto.");
      return;
    }
    setAccessCode("");
    toast.success("Módulo Deal desbloqueado.");
  };

  const openNewDeal = () => {
    setForm(emptyForm(branches));
    setEditorOpen(true);
  };

  const editDeal = (deal: RetailDeal) => {
    setForm({
      id: deal.id,
      name: deal.name,
      sku: deal.sku,
      description: deal.description,
      price: deal.price.toString(),
      startDate: deal.startDate,
      endDate: deal.endDate,
      branches: deal.branches,
      lines: deal.lines,
      createdAtIso: deal.createdAtIso,
    });
    setEditorOpen(true);
  };

  const useRecommendation = (recommendation: DealRecommendation) => {
    const range = currentMonthRange();
    setForm({
      ...emptyForm(branches),
      name: `Deal ${recommendation.productNames.join(" + ")}`,
      description: "Sugerencia generada desde las combinaciones vendidas este mes.",
      price: recommendation.suggestedPrice.toString(),
      startDate: range.start,
      endDate: range.end,
      branches: [...branches],
      lines: recommendation.productIds.map((productId) => ({ productId, quantity: 1 })),
    });
    setEditorOpen(true);
  };

  const addProductLine = (productId: string) => {
    if (!productId || form.lines.some((line) => line.productId === productId)) return;
    setForm((current) => ({
      ...current,
      lines: [...current.lines, { productId, quantity: 1 }],
    }));
  };

  const saveDeal = () => {
    const price = Number(form.price);
    if (!form.name.trim() || !form.sku.trim()) {
      toast.error("Nombre y SKU son obligatorios.");
      return;
    }
    if (form.lines.length < 2) {
      toast.error("Un Deal debe contener al menos dos productos o servicios.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Captura un precio válido para el Deal.");
      return;
    }
    if (!form.startDate || !form.endDate || form.startDate > form.endDate) {
      toast.error("Selecciona una vigencia válida.");
      return;
    }
    if (form.branches.length === 0) {
      toast.error("Selecciona al menos una sucursal.");
      return;
    }
    onSave({
      id: form.id || `deal-${crypto.randomUUID()}`,
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      description: form.description.trim(),
      price,
      lines: form.lines,
      branches: form.branches,
      startDate: form.startDate,
      endDate: form.endDate,
      status: "DRAFT",
      createdAtIso: form.createdAtIso,
      publishedAtIso: null,
      authorizedBy: null,
    });
    setEditorOpen(false);
    toast.success(
      form.id
        ? "Cambios guardados. El Deal volvió a borrador y requiere nueva publicación."
        : "Deal guardado como borrador. Autoriza su publicación para mostrarlo en Sale.",
    );
  };

  const confirmPublish = () => {
    if (!publishDeal) return;
    if (!onPublish(publishDeal.id, publishCode.trim())) {
      toast.error("No fue posible publicar. Revisa el código y que el precio cubra el costo.");
      return;
    }
    toast.success(`${publishDeal.name} quedó publicado en Sale.`);
    setPublishDeal(null);
    setPublishCode("");
  };

  if (!authorized) {
    return (
      <Card className="deal-access-card">
        <CardContent>
          <div className="deal-access-icon"><PackagePlus size={31} /></div>
          <span className="section-kicker">DEAL · ACCESO MASTER</span>
          <h2>Configura paquetes sin modificar el catálogo</h2>
          <p>
            Los precios especiales pertenecen al paquete. Productos, servicios,
            inventario y costos mantienen sus valores originales.
          </p>
          <div className="deal-access-input">
            <KeyRound size={17} />
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") authorizeModule();
              }}
              placeholder="Código master"
              aria-label="Código master para Deal"
            />
            <Button type="button" onClick={authorizeModule} disabled={accessCode.length !== 4}>
              <LockKeyhole size={15} /> Desbloquear
            </Button>
          </div>
          <small>Código estático de prueba: 2468</small>
        </CardContent>
      </Card>
    );
  }

  const visibleDeals = deals.filter(
    (deal) => statusFilter === "ALL" || deal.status === statusFilter,
  );
  const formTotals = getDealTotals({ lines: form.lines }, products);
  const formProfit = Number(form.price || 0) - formTotals.costMxn;
  const monthLabel = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${currentMonth}-15T12:00:00`));

  return (
    <div className="deals-view">
      <Card className="deals-hero-card">
        <CardContent>
          <div>
            <span className="section-kicker">PAQUETES COMERCIALES</span>
            <h2>Deals con precio propio</h2>
            <p>
              Combina productos y servicios. El paquete puede quedar debajo del
              mínimo conjunto, pero su publicación se bloquea si no cubre el costo.
            </p>
          </div>
          <div className="deals-hero-actions">
            <Button type="button" variant="outline" onClick={onLock}>
              <LockKeyhole size={15} /> Bloquear
            </Button>
            <Button type="button" onClick={openNewDeal}>
              <Plus size={16} /> Nuevo Deal
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="deals-metrics">
        <Card><CardContent><PackageCheck size={19} /><span>Deals publicados</span><strong>{deals.filter((deal) => deal.status === "PUBLISHED").length}</strong></CardContent></Card>
        <Card><CardContent><BarChart3 size={19} /><span>Paquetes vendidos · mes</span><strong>{monthlyDealCount}</strong></CardContent></Card>
        <Card><CardContent><TrendingUp size={19} /><span>Ingreso por Deals · mes</span><strong>{formatCurrency(monthlyDealRevenue)}</strong></CardContent></Card>
        <Card><CardContent><Lightbulb size={19} /><span>Recomendaciones</span><strong>{recommendations.length}</strong></CardContent></Card>
      </div>

      <Card className="deal-recommendations-card">
        <CardContent>
          <div className="deals-section-heading">
            <div>
              <span className="section-kicker">RECOMENDACIÓN DINÁMICA · {monthLabel.toUpperCase()}</span>
              <h2>Paquetes sugeridos por historial de venta</h2>
              <p>Prioriza artículos comprados juntos y calcula un precio que nunca baja del costo registrado.</p>
            </div>
            <Sparkles size={24} />
          </div>
          <div className="deal-recommendations-grid">
            {recommendations.map((recommendation) => (
              <article key={recommendation.id}>
                <div className="deal-recommendation-icon"><Lightbulb size={18} /></div>
                <div>
                  <strong>{recommendation.productNames.join(" + ")}</strong>
                  <span>{recommendation.occurrences} coincidencia{recommendation.occurrences === 1 ? "" : "s"} en tickets del mes</span>
                </div>
                <div className="deal-recommendation-pricing">
                  <span>Lista {formatCurrency(recommendation.listTotal)}</span>
                  <strong>Sugerido {formatCurrency(recommendation.suggestedPrice)}</strong>
                  <small>Costo {formatCurrency(recommendation.costTotal)} · utilidad estimada {formatCurrency(recommendation.suggestedPrice - recommendation.costTotal)}</small>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => useRecommendation(recommendation)}>
                  Usar sugerencia
                </Button>
              </article>
            ))}
            {recommendations.length === 0 && (
              <div className="deal-recommendation-empty">Se necesitan tickets con al menos dos artículos para generar recomendaciones del mes.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="deals-list-card">
        <CardContent>
          <div className="deals-section-heading">
            <div>
              <span className="section-kicker">CATÁLOGO DE DEALS</span>
              <h2>Paquetes configurados</h2>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label="Filtrar Deals por estado"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los estados</SelectItem>
                <SelectItem value="PUBLISHED">Publicados</SelectItem>
                <SelectItem value="DRAFT">Borradores</SelectItem>
                <SelectItem value="INACTIVE">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="deals-list">
            {visibleDeals.map((deal) => {
              const totals = getDealTotals(deal, products);
              const salesCount = tickets.reduce(
                (sum, ticket) =>
                  sum +
                  (ticket.status === "COMPLETED"
                    ? (ticket.deals ?? [])
                        .filter((sale) => sale.dealId === deal.id)
                        .reduce((dealSum, sale) => dealSum + sale.quantity, 0)
                    : 0),
                0,
              );
              return (
                <article key={deal.id} className={`deal-record is-${deal.status.toLowerCase()}`}>
                  <div className="deal-record-top">
                    <div className="deal-record-mark"><PackageCheck size={21} /></div>
                    <div>
                      <span>{deal.sku}</span>
                      <h3>{deal.name}</h3>
                      <p>{deal.description || "Sin descripción"}</p>
                    </div>
                    <Badge variant={deal.status === "PUBLISHED" ? "default" : "outline"}>{statusLabels[deal.status]}</Badge>
                  </div>
                  <div className="deal-record-products">
                    {deal.lines.map((line) => {
                      const product = products.find((candidate) => candidate.id === line.productId);
                      return product ? <span key={line.productId}>{line.quantity} × {product.name}</span> : null;
                    })}
                  </div>
                  <div className="deal-record-numbers">
                    <span><small>PRECIO DEAL</small><strong>{formatCurrency(deal.price)}</strong></span>
                    <span><small>MÍNIMO CONJUNTO</small><strong>{formatCurrency(totals.minimum)}</strong></span>
                    <span><small>COSTO MXN</small><strong>{formatCurrency(totals.costMxn)}</strong></span>
                    <span><small>VENDIDOS</small><strong>{salesCount}</strong></span>
                  </div>
                  <div className="deal-record-footer">
                    <span><CalendarRange size={14} /> {deal.startDate} — {deal.endDate}</span>
                    <span><Store size={14} /> {deal.branches.join(", ")}</span>
                    <div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => editDeal(deal)}><Edit3 size={14} /> Editar</Button>
                      {deal.status !== "PUBLISHED" ? (
                        <Button type="button" size="sm" onClick={() => { setPublishDeal(deal); setPublishCode(""); }}><ShieldCheck size={14} /> Autorizar y publicar</Button>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button type="button" variant="outline" size="sm">Inactivar</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Inactivar {deal.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Dejará de aparecer en Sale. Los tickets, conteos, costos y movimientos históricos conservarán el Deal.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Conservar publicado</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeactivate(deal.id)}>Inactivar Deal</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="deal-editor-dialog sm:max-w-[920px]">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Deal" : "Nuevo Deal"}</DialogTitle>
            <DialogDescription>Guardar cambios crea un borrador; la publicación requiere una autorización master independiente.</DialogDescription>
          </DialogHeader>
          <div className="deal-editor-grid">
            <section>
              <div className="deal-editor-fields">
                <div className="field-stack"><Label>Nombre</Label><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Ritual de hidratación" /></div>
                <div className="field-stack"><Label>SKU del Deal</Label><Input value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} /></div>
                <div className="field-stack is-wide"><Label>Descripción</Label><Input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Beneficio o mensaje comercial" /></div>
                <div className="field-stack"><Label>Precio del paquete</Label><Input type="number" min="0" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} /></div>
                <div className="field-stack"><Label>Agregar producto o servicio</Label><Select value="" onValueChange={addProductLine}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{activeProducts.filter((product) => !form.lines.some((line) => line.productId === product.id)).map((product) => <SelectItem key={product.id} value={product.id}>{product.name} · {product.sku}</SelectItem>)}</SelectContent></Select></div>
                <div className="field-stack"><Label>Inicio</Label><DatePicker value={form.startDate} onChange={(startDate) => setForm((current) => ({ ...current, startDate }))} /></div>
                <div className="field-stack"><Label>Fin</Label><DatePicker value={form.endDate} onChange={(endDate) => setForm((current) => ({ ...current, endDate }))} /></div>
              </div>
              <div className="deal-branch-picker">
                <Label>Sucursales donde se puede vender</Label>
                <div>{branches.map((branch) => { const selected = form.branches.includes(branch); return <button key={branch} type="button" className={selected ? "is-selected" : ""} onClick={() => setForm((current) => ({ ...current, branches: selected ? current.branches.filter((item) => item !== branch) : [...current.branches, branch] }))}>{selected && <CheckCircle2 size={14} />}{branch}</button>; })}</div>
              </div>
              <div className="deal-editor-lines">
                <div><span className="section-kicker">CONTENIDO DEL PAQUETE</span><Badge variant="outline">{form.lines.length} artículos</Badge></div>
                {form.lines.map((line) => {
                  const product = products.find((candidate) => candidate.id === line.productId);
                  if (!product) return null;
                  return <article key={line.productId}><img src={product.image} alt="" /><div><strong>{product.name}</strong><span>{product.kind === "SERVICE" ? "Servicio" : "Producto"} · {product.sku}</span></div><Input type="number" min="1" value={line.quantity} onChange={(event) => setForm((current) => ({ ...current, lines: current.lines.map((currentLine) => currentLine.productId === line.productId ? { ...currentLine, quantity: Math.max(1, Number(event.target.value)) } : currentLine) }))} aria-label={`Cantidad de ${product.name}`} /><Button type="button" size="icon" variant="ghost" onClick={() => setForm((current) => ({ ...current, lines: current.lines.filter((currentLine) => currentLine.productId !== line.productId) }))} aria-label={`Quitar ${product.name}`}><X size={15} /></Button></article>;
                })}
              </div>
            </section>
            <aside className="deal-profit-preview">
              <span className="section-kicker">CONTROL DE RENTABILIDAD</span>
              <h3>Vista financiera</h3>
              <div><span>Precio de lista</span><strong>{formatCurrency(formTotals.list)}</strong></div>
              <div><span>Mínimo conjunto</span><strong>{formatCurrency(formTotals.minimum)}</strong></div>
              <div><span>Costo MXN</span><strong>{formatCurrency(formTotals.costMxn)}</strong></div>
              <div><span>Costo USD</span><strong>US${formTotals.costUsd.toFixed(2)}</strong></div>
              <div className={formProfit >= 0 ? "is-profit" : "is-loss"}><span>Utilidad estimada</span><strong>{formatCurrency(formProfit)}</strong></div>
              <p>{formProfit >= 0 ? "El precio cubre el costo registrado. Puede enviarse a autorización." : "Este precio representa pérdida y no podrá publicarse."}</p>
              {Number(form.price || 0) < formTotals.minimum && <Badge variant="outline">Debajo del mínimo conjunto · permitido sólo como Deal</Badge>}
            </aside>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>Cancelar</Button><Button type="button" onClick={saveDeal}><PackagePlus size={15} /> Guardar borrador</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(publishDeal)} onOpenChange={(open) => { if (!open) { setPublishDeal(null); setPublishCode(""); } }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Autorizar publicación</DialogTitle><DialogDescription>El Deal aparecerá en Sale únicamente después de validar rentabilidad y código master.</DialogDescription></DialogHeader>
          {publishDeal && (() => { const totals = getDealTotals(publishDeal, products); return <div className="deal-publish-confirm"><div><PackageCheck size={21} /><span><strong>{publishDeal.name}</strong><small>{publishDeal.sku}</small></span></div><div><span>Precio Deal</span><strong>{formatCurrency(publishDeal.price)}</strong></div><div><span>Costo registrado</span><strong>{formatCurrency(totals.costMxn)}</strong></div><div><span>Utilidad estimada</span><strong className={publishDeal.price >= totals.costMxn ? "is-positive" : "is-negative"}>{formatCurrency(publishDeal.price - totals.costMxn)}</strong></div><div className="deal-publish-code"><KeyRound size={16} /><Input type="password" inputMode="numeric" maxLength={4} value={publishCode} onChange={(event) => setPublishCode(event.target.value)} placeholder="Código master" aria-label="Código para publicar Deal" /></div></div>; })()}
          <DialogFooter><Button type="button" variant="outline" onClick={() => setPublishDeal(null)}>Cancelar</Button><Button type="button" onClick={confirmPublish} disabled={publishCode.length !== 4}><ShieldCheck size={15} /> Publicar en Sale</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
