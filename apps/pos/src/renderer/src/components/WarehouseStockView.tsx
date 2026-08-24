import { useMemo, useState } from "react";
import { AlertTriangle, FileDown, FileSpreadsheet, PackagePlus, Pencil, Plus, Printer, RefreshCw, Trash2 } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  toast,
} from "@cosmetics/ui";
import { formatCurrency } from "../mock-data";
import type { Product, WarehouseMovement, WarehouseMovementLine, WarehouseStock, WarehouseSupplier, WarehouseSupplyItem } from "../types";

interface WarehouseStockViewProps {
  products: Product[];
  supplies: WarehouseSupplyItem[];
  suppliers: WarehouseSupplier[];
  stock: WarehouseStock;
  movements: WarehouseMovement[];
  canManage: boolean;
  onToggleVisibility: (id: string) => void;
  onSaveSupply: (item: WarehouseSupplyItem) => boolean;
  onDeleteSupply: (id: string) => void;
  onCreateRestockOrder: (supplierId: string, lines: WarehouseMovementLine[], comment: string) => boolean;
}

const newSupply = (supplier?: WarehouseSupplier): WarehouseSupplyItem => ({
  id: `supply-${crypto.randomUUID()}`,
  name: "",
  sku: `INS-${Date.now().toString(36).toUpperCase()}`,
  unit: "pieza",
  image: "/products/renewal-serum.png",
  costUsd: 0,
  costMxn: 0,
  partnerCost: 0,
  retailPrice: 0,
  family: "Insumos",
  category: "General",
  stockMin: 0,
  stockMax: 0,
  presentation: "Caja",
  unitsPerPackage: 1,
  supplierId: supplier?.id ?? null,
  supplierName: supplier?.businessName ?? null,
  active: true,
  branchVisible: true,
});

export function WarehouseStockView({ products, supplies, suppliers, stock, movements, canManage, onToggleVisibility, onSaveSupply, onDeleteSupply, onCreateRestockOrder }: WarehouseStockViewProps) {
  const physicalProducts = products.filter((product) => product.kind === "PRODUCT" && product.active);
  const [itemDraft, setItemDraft] = useState<WarehouseSupplyItem | null>(null);
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockSupplierId, setRestockSupplierId] = useState(suppliers.find((supplier) => supplier.active)?.id ?? "");
  const [restockLines, setRestockLines] = useState<Array<{ id: string; quantity: number }>>([]);
  const [restockComment, setRestockComment] = useState("");

  const rows = useMemo(() => [
    ...physicalProducts.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      image: product.image,
      family: product.family,
      category: product.category,
      unit: "pieza",
      presentation: product.presentation ?? "Pieza individual",
      unitsPerPackage: product.unitsPerPackage ?? 1,
      supplierId: product.supplierId ?? null,
      supplierName: product.supplierName ?? "Sin proveedor",
      costUsd: product.costUsd,
      costMxn: product.costMxn,
      partnerCost: product.partnerCost ?? Math.round(product.costMxn * 1.22),
      retailPrice: product.maxPrice,
      stockMin: product.stockMin ?? 0,
      stockMax: product.stockMax ?? 0,
      quantity: stock[product.id] ?? 0,
      source: "PRODUCT" as const,
      visible: true,
    })),
    ...supplies.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      image: item.image,
      family: item.family,
      category: item.category,
      unit: item.unit,
      presentation: item.presentation,
      unitsPerPackage: item.unitsPerPackage,
      supplierId: item.supplierId,
      supplierName: item.supplierName ?? "Sin proveedor",
      costUsd: item.costUsd,
      costMxn: item.costMxn,
      partnerCost: item.partnerCost,
      retailPrice: item.retailPrice,
      stockMin: item.stockMin,
      stockMax: item.stockMax,
      quantity: stock[item.id] ?? 0,
      source: "SUPPLY" as const,
      visible: item.branchVisible,
    })),
  ], [physicalProducts, stock, supplies]);

  const entriesFor = (id: string) => movements.filter((movement) => (movement.kind === "ENTRY" || movement.kind === "PURCHASE_ORDER") && movement.status === "RECEIVED").flatMap((movement) => movement.lines).filter((line) => line.productId === id).reduce((sum, line) => sum + line.quantity, 0);
  const outputsFor = (id: string) => movements.filter((movement) => movement.kind !== "ENTRY" && movement.kind !== "PURCHASE_ORDER" && ["SENT", "RECEIVED"].includes(movement.status)).flatMap((movement) => movement.lines).filter((line) => line.productId === id).reduce((sum, line) => sum + line.quantity, 0);
  const stockState = (quantity: number, minimum: number, maximum: number) => quantity < minimum ? "is-low" : maximum > 0 && quantity > maximum ? "is-high" : "is-ok";

  const exportInventoryExcel = async () => {
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.json_to_sheet(rows.map((row) => ({ Producto: row.name, SKU: row.sku, Proveedor: row.supplierName, Familia: row.family, Categoría: row.category, Presentación: row.presentation, "Piezas por caja": row.unitsPerPackage, Unidad: row.unit, Existencia: row.quantity, "Stock mínimo": row.stockMin, "Stock máximo": row.stockMax, Ingresos: entriesFor(row.id), Salidas: outputsFor(row.id), "Costo MXN": row.costMxn, "Costo USD": row.costUsd, "Precio socio": row.partnerCost, "Precio sugerido": row.retailPrice })));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Inventario bodega");
    XLSX.writeFile(book, `inventario-bodega-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportInventoryPdf = async () => {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    doc.setFontSize(18); doc.text("KEYSAR · INVENTARIO GENERAL DE BODEGA", 38, 42);
    doc.setFontSize(9); doc.text(`${rows.length} artículos · ${rows.reduce((sum, row) => sum + row.quantity, 0)} unidades`, 38, 58);
    autoTable(doc, { startY: 73, head: [["SKU", "Producto", "Proveedor", "Familia / categoría", "Presentación", "Stock", "Mín.", "Máx.", "Costo MXN", "Costo USD", "Socio"]], body: rows.map((row) => [row.sku, row.name, row.supplierName, `${row.family} / ${row.category}`, `${row.presentation} · ${row.unitsPerPackage} pz`, row.quantity, row.stockMin, row.stockMax, formatCurrency(row.costMxn), `$${row.costUsd.toFixed(2)}`, formatCurrency(row.partnerCost)]), styles: { fontSize: 7 }, headStyles: { fillColor: [109, 82, 61] } });
    doc.save(`inventario-bodega-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const proposedForSupplier = (supplierId: string) => rows.filter((row) => row.supplierId === supplierId && row.stockMax > row.quantity).map((row) => ({ id: row.id, quantity: row.stockMax - row.quantity }));
  const openRestock = () => {
    const supplierId = suppliers.find((supplier) => supplier.active && proposedForSupplier(supplier.id).length > 0)?.id ?? suppliers.find((supplier) => supplier.active)?.id ?? "";
    setRestockSupplierId(supplierId);
    setRestockLines(proposedForSupplier(supplierId));
    setRestockComment("Pedido sugerido para completar el stock máximo de bodega.");
    setRestockOpen(true);
  };
  const selectRestockSupplier = (supplierId: string) => { setRestockSupplierId(supplierId); setRestockLines(proposedForSupplier(supplierId)); };
  const submitRestock = () => {
    const lines: WarehouseMovementLine[] = restockLines.flatMap((draft) => {
      const row = rows.find((candidate) => candidate.id === draft.id);
      if (!row || draft.quantity <= 0) return [];
      return [{ productId: row.id, productName: row.name, sku: row.sku, itemType: row.source === "SUPPLY" ? "SUPPLY" : "PRODUCT", quantity: draft.quantity, unitCostUsd: row.costUsd, unitCostMxn: row.costMxn, partnerCost: row.partnerCost, partnerCostUsd: row.costUsd, retailPrice: row.retailPrice, family: row.family, category: row.category, supplierId: row.supplierId, supplierName: row.supplierName, presentation: row.presentation, unitsPerPackage: row.unitsPerPackage }];
    });
    if (!onCreateRestockOrder(restockSupplierId, lines, restockComment)) return;
    setRestockOpen(false);
  };

  const saveItem = () => { if (itemDraft && onSaveSupply(itemDraft)) setItemDraft(null); };

  return <div className="view-stack warehouse-stock-catalog">
    <Card className="warehouse-panel"><CardContent>
      <div className="warehouse-panel-heading"><div><span>EXISTENCIAS MATRIZ</span><h2>Inventario general de bodega</h2><p>Productos e insumos con proveedor, presentación, costos y límites de resurtido.</p></div><div>
        <Button variant="outline" onClick={() => void exportInventoryExcel()}><FileSpreadsheet size={16} /> Excel</Button><Button variant="outline" onClick={() => void exportInventoryPdf()}><FileDown size={16} /> PDF</Button><Button variant="outline" onClick={() => window.print()}><Printer size={16} /> Imprimir</Button>
        {canManage && <><Button variant="outline" onClick={openRestock}><RefreshCw size={16} /> Generar pedido / resurtido</Button><Button onClick={() => setItemDraft(newSupply(suppliers.find((supplier) => supplier.active)))}><Plus size={16} /> Agregar producto</Button></>}
      </div></div>
      <div className="warehouse-table-wrap"><Table><TableHeader><TableRow><TableHead>Producto / proveedor</TableHead><TableHead>Familia / categoría</TableHead><TableHead>Presentación</TableHead><TableHead>Stock</TableHead><TableHead>Mín. / Máx.</TableHead><TableHead>Ingresos / salidas</TableHead><TableHead>Costo MXN / USD</TableHead><TableHead>Precio socio</TableHead><TableHead>Retail</TableHead><TableHead>Visible</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell><div className="warehouse-product"><img src={row.image} alt="" /><span><strong>{row.name}</strong><small>{row.sku}</small><small>{row.supplierName}</small></span></div></TableCell><TableCell><strong>{row.family}</strong><small>{row.category}</small></TableCell><TableCell><strong>{row.presentation}</strong><small>{row.unitsPerPackage} piezas · {row.unit}</small></TableCell><TableCell><strong className={`warehouse-stock-number ${stockState(row.quantity, row.stockMin, row.stockMax)}`}>{row.quantity}</strong></TableCell><TableCell><strong>{row.stockMin} / {row.stockMax}</strong><small>{Math.max(0, row.stockMax - row.quantity)} para máximo</small></TableCell><TableCell><span className="is-positive">+{entriesFor(row.id)}</span> / <span className="is-negative">-{outputsFor(row.id)}</span></TableCell><TableCell><strong>{formatCurrency(row.costMxn)}</strong><small>USD ${row.costUsd.toFixed(2)}</small></TableCell><TableCell>{formatCurrency(row.partnerCost)}</TableCell><TableCell>{formatCurrency(row.retailPrice)}</TableCell><TableCell>{row.source === "SUPPLY" ? <button type="button" role="switch" aria-checked={row.visible} className={`warehouse-visibility-switch ${row.visible ? "is-on" : ""}`} disabled={!canManage} onClick={() => onToggleVisibility(row.id)}><span>{row.visible ? "VISIBLE" : "OCULTO"}</span><i /></button> : <Badge variant="outline">RETAIL</Badge>}</TableCell><TableCell>{row.source === "SUPPLY" && canManage ? <div className="warehouse-row-actions"><Button size="sm" variant="outline" onClick={() => setItemDraft({ ...supplies.find((item) => item.id === row.id)! })}><Pencil size={14} /></Button><Button size="sm" variant="outline" onClick={() => onDeleteSupply(row.id)}><Trash2 size={14} /></Button></div> : <Badge variant="outline">Catálogo</Badge>}</TableCell></TableRow>)}</TableBody></Table></div>
    </CardContent></Card>

    <Dialog open={Boolean(itemDraft)} onOpenChange={(open) => !open && setItemDraft(null)}><DialogContent className="sm:max-w-[850px]"><DialogHeader><DialogTitle>{supplies.some((item) => item.id === itemDraft?.id) ? "Editar producto de bodega" : "Agregar producto a bodega"}</DialogTitle><DialogDescription>Captura proveedor, costos, precio socio, unidad, presentación y límites de stock.</DialogDescription></DialogHeader>{itemDraft && <div className="warehouse-item-form">
      <div className="field-stack"><Label>Proveedor</Label><Select value={itemDraft.supplierId ?? "NONE"} onValueChange={(value) => { const supplier = suppliers.find((candidate) => candidate.id === value); setItemDraft({ ...itemDraft, supplierId: supplier?.id ?? null, supplierName: supplier?.businessName ?? null }); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NONE">Sin proveedor</SelectItem>{suppliers.filter((supplier) => supplier.active).map((supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.businessName}</SelectItem>)}</SelectContent></Select></div>
      <div className="field-stack"><Label>Nombre del producto</Label><Input value={itemDraft.name} onChange={(event) => setItemDraft({ ...itemDraft, name: event.target.value })} /></div><div className="field-stack"><Label>SKU</Label><Input value={itemDraft.sku} onChange={(event) => setItemDraft({ ...itemDraft, sku: event.target.value.toLocaleUpperCase("es-MX") })} /></div><div className="field-stack"><Label>Familia</Label><Input value={itemDraft.family} onChange={(event) => setItemDraft({ ...itemDraft, family: event.target.value })} /></div><div className="field-stack"><Label>Categoría</Label><Input value={itemDraft.category} onChange={(event) => setItemDraft({ ...itemDraft, category: event.target.value })} /></div><div className="field-stack"><Label>Unidad de medida</Label><Input value={itemDraft.unit} onChange={(event) => setItemDraft({ ...itemDraft, unit: event.target.value })} /></div><div className="field-stack"><Label>Presentación</Label><Input value={itemDraft.presentation} onChange={(event) => setItemDraft({ ...itemDraft, presentation: event.target.value })} /></div><div className="field-stack"><Label>Piezas por caja</Label><Input type="number" min="1" value={itemDraft.unitsPerPackage} onChange={(event) => setItemDraft({ ...itemDraft, unitsPerPackage: Math.max(1, Number(event.target.value) || 1) })} /></div><div className="field-stack"><Label>Costo MXN</Label><Input type="number" min="0" step="0.01" value={itemDraft.costMxn} onChange={(event) => setItemDraft({ ...itemDraft, costMxn: Math.max(0, Number(event.target.value) || 0) })} /></div><div className="field-stack"><Label>Costo USD</Label><Input type="number" min="0" step="0.01" value={itemDraft.costUsd} onChange={(event) => setItemDraft({ ...itemDraft, costUsd: Math.max(0, Number(event.target.value) || 0) })} /></div><div className="field-stack"><Label>Precio socio</Label><Input type="number" min="0" step="0.01" value={itemDraft.partnerCost} onChange={(event) => setItemDraft({ ...itemDraft, partnerCost: Math.max(0, Number(event.target.value) || 0) })} /></div><div className="field-stack"><Label>Precio sugerido</Label><Input type="number" min="0" step="0.01" value={itemDraft.retailPrice} onChange={(event) => setItemDraft({ ...itemDraft, retailPrice: Math.max(0, Number(event.target.value) || 0) })} /></div><div className="field-stack"><Label>Stock mínimo</Label><Input type="number" min="0" value={itemDraft.stockMin} onChange={(event) => setItemDraft({ ...itemDraft, stockMin: Math.max(0, Number(event.target.value) || 0) })} /></div><div className="field-stack"><Label>Stock máximo</Label><Input type="number" min="0" value={itemDraft.stockMax} onChange={(event) => setItemDraft({ ...itemDraft, stockMax: Math.max(0, Number(event.target.value) || 0) })} /></div><div className="field-stack warehouse-item-image"><Label>Imagen / URL</Label><Input value={itemDraft.image} onChange={(event) => setItemDraft({ ...itemDraft, image: event.target.value })} /></div>
    </div>}<DialogFooter><Button variant="outline" onClick={() => setItemDraft(null)}>Cancelar</Button><Button onClick={saveItem} disabled={!itemDraft?.name.trim() || !itemDraft?.sku.trim() || itemDraft.stockMax < itemDraft.stockMin}>Guardar producto</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={restockOpen} onOpenChange={setRestockOpen}><DialogContent className="warehouse-restock-dialog sm:max-w-[820px]"><DialogHeader><DialogTitle>Generar pedido de resurtido</DialogTitle><DialogDescription>La propuesta completa cada artículo hasta su stock máximo. Puedes editar cantidades antes de solicitar aprobación.</DialogDescription></DialogHeader><div className="field-stack"><Label>Proveedor</Label><Select value={restockSupplierId} onValueChange={selectRestockSupplier}><SelectTrigger><SelectValue placeholder="Selecciona proveedor" /></SelectTrigger><SelectContent>{suppliers.filter((supplier) => supplier.active).map((supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.folio} · {supplier.businessName}</SelectItem>)}</SelectContent></Select></div><div className="warehouse-restock-lines">{restockLines.map((line) => { const row = rows.find((candidate) => candidate.id === line.id); return <div key={line.id}><span><strong>{row?.name}</strong><small>{row?.sku} · stock {row?.quantity} / máximo {row?.stockMax} · {row?.presentation}</small></span><Input type="number" min="1" value={line.quantity} onChange={(event) => setRestockLines((current) => current.map((candidate) => candidate.id === line.id ? { ...candidate, quantity: Math.max(1, Number(event.target.value) || 1) } : candidate))} /><Button variant="outline" size="sm" onClick={() => setRestockLines((current) => current.filter((candidate) => candidate.id !== line.id))}><Trash2 size={14} /></Button></div>; })}{restockLines.length === 0 && <p><AlertTriangle size={17} /> El proveedor no tiene productos por debajo del stock máximo.</p>}</div><div className="field-stack"><Label>Comentario del pedido</Label><Textarea value={restockComment} onChange={(event) => setRestockComment(event.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setRestockOpen(false)}>Cancelar</Button><Button onClick={submitRestock} disabled={!restockSupplierId || restockLines.length === 0}><PackagePlus size={16} /> Solicitar doble aprobación</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
