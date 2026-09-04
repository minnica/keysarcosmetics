import { useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, Building2, Pencil, Plus, Power, PowerOff, Trash2, Users } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@cosmetics/ui";
import { formatCurrency } from "../mock-data";
import type { Client, Product, WarehousePriceList, WarehouseSupplyItem } from "../types";

interface WarehousePriceListsProps {
  lists: WarehousePriceList[];
  products: Product[];
  supplies: WarehouseSupplyItem[];
  branches: string[];
  clients: Client[];
  canManage: boolean;
  onSave: (list: WarehousePriceList) => boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function WarehousePriceLists({
  lists,
  products,
  supplies,
  branches,
  clients,
  canManage,
  onSave,
  onToggle,
  onDelete,
}: WarehousePriceListsProps) {
  const warehouseItems = useMemo(() => [
    ...products.filter((product) => product.kind === "PRODUCT").map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      family: product.family,
      category: product.category,
      image: product.image,
      defaultMxn: product.partnerCost ?? Math.round(product.costMxn * 1.22),
      defaultUsd: Math.round(product.costUsd * 1.22 * 100) / 100,
    })),
    ...supplies.map((supply) => ({
      id: supply.id,
      name: supply.name,
      sku: supply.sku,
      family: "Insumos",
      category: supply.unit,
      image: supply.image,
      defaultMxn: supply.partnerCost,
      defaultUsd: Math.round(supply.costUsd * 1.22 * 100) / 100,
    })),
  ], [products, supplies]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<WarehousePriceList | null>(null);

  useEffect(() => {
    setDraft((current) =>
      current
        ? {
            ...current,
            branchNames: current.branchNames.filter((branch) =>
              branches.includes(branch),
            ),
          }
        : current,
    );
  }, [branches]);

  const openNew = () => {
    setDraft({
      id: `warehouse-price-${crypto.randomUUID()}`,
      name: "",
      active: true,
      branchNames: branches.slice(0, 1),
      clientIds: [],
      items: warehouseItems.map((item) => ({ productId: item.id, priceMxn: item.defaultMxn, priceUsd: item.defaultUsd })),
      createdAtIso: new Date().toISOString(),
    });
    setDialogOpen(true);
  };

  const openEdit = (list: WarehousePriceList) => {
    setDraft({
      ...list,
      branchNames: [...list.branchNames],
      clientIds: [...list.clientIds],
      items: warehouseItems.map((item) => list.items.find((candidate) => candidate.productId === item.id) ?? { productId: item.id, priceMxn: item.defaultMxn, priceUsd: item.defaultUsd }),
    });
    setDialogOpen(true);
  };

  const toggleBranch = (branch: string) => setDraft((current) => current ? {
    ...current,
    branchNames: current.branchNames.includes(branch)
      ? current.branchNames.filter((candidate) => candidate !== branch)
      : [...current.branchNames, branch],
  } : current);

  const toggleClient = (clientId: string) => setDraft((current) => current ? {
    ...current,
    clientIds: current.clientIds.includes(clientId)
      ? current.clientIds.filter((candidate) => candidate !== clientId)
      : [...current.clientIds, clientId],
  } : current);

  const updatePrice = (productId: string, currency: "priceMxn" | "priceUsd", value: number) => setDraft((current) => current ? {
    ...current,
    items: current.items.map((item) => item.productId === productId ? { ...item, [currency]: Math.max(0, value) } : item),
  } : current);

  const save = () => {
    if (!draft || !onSave(draft)) return;
    setDialogOpen(false);
    setDraft(null);
  };

  const activeLists = lists.filter((list) => list.active);
  const assignedClients = new Set(lists.flatMap((list) => list.clientIds)).size;
  const coveredBranches = new Set(activeLists.flatMap((list) => list.branchNames)).size;

  return (
    <div className="view-stack warehouse-price-list-view">
      <section className="warehouse-price-list-metrics">
        <Card><CardContent className="warehouse-price-list-metric-content"><BadgeDollarSign size={20} /><span>LISTAS ACTIVAS</span><strong>{activeLists.length}</strong><small>{lists.length} registradas</small></CardContent></Card>
        <Card><CardContent className="warehouse-price-list-metric-content"><Building2 size={20} /><span>SUCURSALES CUBIERTAS</span><strong>{coveredBranches}</strong><small>Asignación vigente</small></CardContent></Card>
        <Card><CardContent className="warehouse-price-list-metric-content"><Users size={20} /><span>CLIENTES ESPECIALES</span><strong>{assignedClients}</strong><small>Con lista personalizada</small></CardContent></Card>
        <Card><CardContent className="warehouse-price-list-metric-content"><BadgeDollarSign size={20} /><span>ARTÍCULOS COTIZADOS</span><strong>{warehouseItems.length}</strong><small>Productos e insumos</small></CardContent></Card>
      </section>

      <Card className="warehouse-panel">
        <CardContent>
          <div className="warehouse-panel-heading">
            <div><span>PRECIOS SOCIO POR SUCURSAL</span><h2>Listas de precios</h2><p>Asigna precios MXN/USD por cliente y sucursal. Los pedidos guardan un snapshot histórico.</p></div>
            {canManage && <Button type="button" onClick={openNew}><Plus size={16} /> Nueva lista</Button>}
          </div>
          <div className="warehouse-price-list-cards">
            {lists.map((list) => (
              <article key={list.id} className={list.active ? "" : "is-inactive"}>
                <header><span><strong>{list.name}</strong><small>{list.clientIds.length > 0 ? `${list.clientIds.length} clientes asignados` : "Lista general de sucursal"}</small></span><Badge variant="outline">{list.active ? "ACTIVA" : "INACTIVA"}</Badge></header>
                <div><Building2 size={14} /><span>{list.branchNames.join(" · ") || "Sin sucursales"}</span></div>
                <div><Users size={14} /><span>{list.clientIds.length > 0 ? clients.filter((client) => list.clientIds.includes(client.id)).map((client) => `${client.firstName} ${client.lastName}`).join(" · ") : "Disponible para cualquier cliente"}</span></div>
                <footer>
                  <strong>{list.items.length} precios</strong>
                  {canManage && <span><Button type="button" size="icon" variant="outline" className="icon-action-button" onClick={() => openEdit(list)} aria-label={`Editar ${list.name}`} title="Editar"><Pencil size={15} /></Button><Button type="button" size="icon" variant="outline" className="icon-action-button" onClick={() => onToggle(list.id)} aria-label={`${list.active ? "Inactivar" : "Activar"} ${list.name}`} title={list.active ? "Inactivar" : "Activar"}>{list.active ? <PowerOff size={15} /> : <Power size={15} />}</Button><Button type="button" size="icon" variant="outline" className="icon-action-button is-danger" onClick={() => onDelete(list.id)} aria-label={`Borrar ${list.name}`} title="Borrar"><Trash2 size={15} /></Button></span>}
                </footer>
              </article>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="warehouse-price-list-dialog sm:max-w-[1000px]">
          <DialogHeader><DialogTitle>{lists.some((list) => list.id === draft?.id) ? "Editar lista de precios" : "Nueva lista de precios"}</DialogTitle><DialogDescription>Configura alcance y precios. Un cliente específico podrá elegir esta lista únicamente en las sucursales asignadas.</DialogDescription></DialogHeader>
          {draft && <div className="warehouse-price-list-form">
            <div className="field-stack"><Label>Nombre de la lista</Label><Input value={draft.name} onChange={(event) => setDraft((current) => current ? { ...current, name: event.target.value } : current)} placeholder="Ej. Distribuidor norte" /></div>
            <section><Label>Sucursales</Label><div className="warehouse-price-selector">{branches.map((branch) => <button type="button" key={branch} className={draft.branchNames.includes(branch) ? "is-selected" : ""} onClick={() => toggleBranch(branch)}>{branch}</button>)}</div></section>
            <section><Label>Clientes asignados <small>Sin selección = lista general</small></Label><div className="warehouse-price-selector is-clients">{clients.map((client) => <button type="button" key={client.id} className={draft.clientIds.includes(client.id) ? "is-selected" : ""} onClick={() => toggleClient(client.id)}>{client.firstName} {client.lastName}</button>)}</div></section>
            <div className="warehouse-table-wrap warehouse-price-matrix"><Table><TableHeader><TableRow><TableHead>Producto / insumo</TableHead><TableHead>Familia</TableHead><TableHead>Categoría</TableHead><TableHead>Precio socio MXN</TableHead><TableHead>Precio socio USD</TableHead></TableRow></TableHeader><TableBody>{warehouseItems.map((item) => { const price = draft.items.find((candidate) => candidate.productId === item.id); return <TableRow key={item.id}><TableCell><div className="warehouse-product"><img src={item.image} alt="" /><span><strong>{item.name}</strong><small>{item.sku}</small></span></div></TableCell><TableCell>{item.family}</TableCell><TableCell>{item.category}</TableCell><TableCell><Input type="number" min="0" step="0.01" value={price?.priceMxn ?? 0} onChange={(event) => updatePrice(item.id, "priceMxn", Number(event.target.value) || 0)} /></TableCell><TableCell><Input type="number" min="0" step="0.01" value={price?.priceUsd ?? 0} onChange={(event) => updatePrice(item.id, "priceUsd", Number(event.target.value) || 0)} /></TableCell></TableRow>; })}</TableBody></Table></div>
          </div>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="button" onClick={save} disabled={!draft?.name.trim() || draft.branchNames.length === 0}><BadgeDollarSign size={16} /> Guardar lista</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
