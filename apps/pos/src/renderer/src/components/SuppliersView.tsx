import { useMemo, useState, type ChangeEvent } from "react";
import {
  BadgeCheck,
  Building2,
  Download,
  Eye,
  FileDown,
  FileSpreadsheet,
  Mail,
  PackagePlus,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Upload,
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
import type { Product, WarehouseSupplier, WarehouseSupplyItem } from "../types";

interface SuppliersViewProps {
  suppliers: WarehouseSupplier[];
  products: Product[];
  supplies: WarehouseSupplyItem[];
  canManage: boolean;
  onSaveSupplier: (supplier: WarehouseSupplier) => boolean;
  onToggleSupplier: (id: string) => void;
  onDeleteSupplier: (id: string) => void;
  onSaveItem: (item: WarehouseSupplyItem) => boolean;
  onDeleteItem: (id: string) => void;
}

const emptySupplier = (): WarehouseSupplier => ({
  id: `supplier-${crypto.randomUUID()}`,
  folio: `PROV-${Date.now().toString(36).toUpperCase()}`,
  businessName: "",
  contactName: "",
  rfc: "",
  taxRegime: "601 · General de Ley",
  businessLine: "",
  phone: "",
  email: "",
  address: "",
  active: true,
  createdAtIso: new Date().toISOString(),
});

const emptyItem = (supplier?: WarehouseSupplier): WarehouseSupplyItem => ({
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

export function SuppliersView({
  suppliers,
  products,
  supplies,
  canManage,
  onSaveSupplier,
  onToggleSupplier,
  onDeleteSupplier,
  onSaveItem,
  onDeleteItem,
}: SuppliersViewProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [supplierDraft, setSupplierDraft] = useState<WarehouseSupplier | null>(null);
  const [itemDraft, setItemDraft] = useState<WarehouseSupplyItem | null>(null);
  const [detailSupplier, setDetailSupplier] = useState<WarehouseSupplier | null>(null);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);

  const supplierItems = (supplierId: string) => [
    ...products.filter((product) => product.kind === "PRODUCT" && product.supplierId === supplierId).map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      family: product.family,
      category: product.category,
      presentation: product.presentation ?? "Pieza individual",
      units: product.unitsPerPackage ?? 1,
      costMxn: product.costMxn,
      costUsd: product.costUsd,
      partnerCost: product.partnerCost ?? product.costMxn,
      source: "Catálogo retail",
    })),
    ...supplies.filter((item) => item.supplierId === supplierId).map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      family: item.family,
      category: item.category,
      presentation: item.presentation,
      units: item.unitsPerPackage,
      costMxn: item.costMxn,
      costUsd: item.costUsd,
      partnerCost: item.partnerCost,
      source: "Bodega / insumo",
    })),
  ];

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-MX");
    return suppliers.filter((supplier) => {
      if (status === "ACTIVE" && !supplier.active) return false;
      if (status === "INACTIVE" && supplier.active) return false;
      if (!query) return true;
      return [supplier.folio, supplier.businessName, supplier.contactName, supplier.rfc, supplier.businessLine, supplier.email, supplier.phone]
        .some((value) => value.toLocaleLowerCase("es-MX").includes(query));
    });
  }, [search, status, suppliers]);

  const totalCatalogItems = suppliers.reduce((sum, supplier) => sum + supplierItems(supplier.id).length, 0);
  const totalCatalogValue = supplies.reduce((sum, item) => sum + item.partnerCost, 0) + products.filter((product) => product.kind === "PRODUCT").reduce((sum, product) => sum + (product.partnerCost ?? product.costMxn), 0);
  const detailCatalogItem = detailSupplier && detailItemId ? supplierItems(detailSupplier.id).find((item) => item.id === detailItemId) ?? null : null;

  const saveSupplier = () => {
    if (!supplierDraft || !onSaveSupplier(supplierDraft)) return;
    setSupplierDraft(null);
  };

  const saveItem = () => {
    if (!itemDraft) return;
    const supplier = suppliers.find((candidate) => candidate.id === itemDraft.supplierId);
    const normalized = { ...itemDraft, supplierName: supplier?.businessName ?? null };
    if (!onSaveItem(normalized)) return;
    setItemDraft(null);
  };

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const supplierRows = filtered.map((supplier) => ({
      Folio: supplier.folio,
      Proveedor: supplier.businessName,
      RFC: supplier.rfc,
      "Régimen fiscal": supplier.taxRegime,
      Giro: supplier.businessLine,
      Contacto: supplier.contactName,
      Teléfono: supplier.phone,
      Correo: supplier.email,
      Dirección: supplier.address,
      Productos: supplierItems(supplier.id).length,
      Estatus: supplier.active ? "ACTIVO" : "INACTIVO",
    }));
    const itemRows = filtered.flatMap((supplier) => supplierItems(supplier.id).map((item) => ({
      Proveedor: supplier.businessName,
      Folio: supplier.folio,
      SKU: item.sku,
      Producto: item.name,
      Familia: item.family,
      Categoría: item.category,
      Presentación: item.presentation,
      "Piezas por caja": item.units,
      "Costo MXN": item.costMxn,
      "Costo USD": item.costUsd,
      "Precio socio": item.partnerCost,
      Origen: item.source,
    })));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(supplierRows), "Proveedores");
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(itemRows), "Productos");
    XLSX.writeFile(book, `proveedores-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPdf = async () => {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    doc.setFontSize(18);
    doc.text("KEYSAR · DIRECTORIO DE PROVEEDORES", 38, 42);
    doc.setFontSize(9);
    doc.text(`${filtered.length} proveedores · ${totalCatalogItems} productos vinculados`, 38, 59);
    autoTable(doc, {
      startY: 74,
      head: [["Folio", "Proveedor", "RFC", "Giro", "Contacto", "Teléfono", "Correo", "Productos", "Estatus"]],
      body: filtered.map((supplier) => [supplier.folio, supplier.businessName, supplier.rfc, supplier.businessLine, supplier.contactName, supplier.phone, supplier.email, supplierItems(supplier.id).length, supplier.active ? "Activo" : "Inactivo"]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [109, 82, 61] },
    });
    doc.save(`proveedores-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.json_to_sheet([{ "Razón social": "Proveedor ejemplo", RFC: "XAXX010101000", "Régimen fiscal": "601", Giro: "Insumos", Contacto: "Nombre", Teléfono: "", Correo: "", Dirección: "" }]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Proveedores");
    XLSX.writeFile(book, "plantilla-proveedores.xlsx");
  };

  const importTemplate = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
      if (!sheet) throw new Error("Sin hoja");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      let created = 0;
      rows.forEach((row, index) => {
        const businessName = String(row["Razón social"] ?? "").trim();
        if (!businessName) return;
        const supplier: WarehouseSupplier = {
          ...emptySupplier(),
          id: `supplier-import-${crypto.randomUUID()}`,
          folio: `PROV-IMP-${String(index + 1).padStart(3, "0")}`,
          businessName,
          rfc: String(row.RFC ?? "").trim().toLocaleUpperCase("es-MX"),
          taxRegime: String(row["Régimen fiscal"] ?? "601").trim(),
          businessLine: String(row.Giro ?? "").trim(),
          contactName: String(row.Contacto ?? "").trim(),
          phone: String(row.Teléfono ?? "").trim(),
          email: String(row.Correo ?? "").trim(),
          address: String(row.Dirección ?? "").trim(),
        };
        if (onSaveSupplier(supplier)) created += 1;
      });
      toast.success(`${created} proveedores cargados desde plantilla.`);
    } catch {
      toast.error("No fue posible leer la plantilla de proveedores.");
    }
  };

  return (
    <div className="suppliers-view view-stack">
      <section className="suppliers-hero">
        <div><span className="section-kicker">ABASTECIMIENTO Y COMPRAS</span><h2>Lista de proveedores</h2><p>Datos fiscales, contactos y catálogo vinculado a inventario y bodega.</p></div>
        <Badge variant="outline"><BadgeCheck size={14} /> Acceso autorizado</Badge>
      </section>

      <section className="suppliers-metrics">
        <Card><CardContent className="supplier-metric-content"><Building2 size={20} /><span>PROVEEDORES ACTIVOS</span><strong>{suppliers.filter((supplier) => supplier.active).length}</strong><small>{suppliers.length} registros</small></CardContent></Card>
        <Card><CardContent className="supplier-metric-content"><PackagePlus size={20} /><span>ARTÍCULOS VINCULADOS</span><strong>{totalCatalogItems}</strong><small>Retail, insumos y artículos</small></CardContent></Card>
        <Card><CardContent className="supplier-metric-content"><BadgeCheck size={20} /><span>VALOR CATÁLOGO SOCIO</span><strong>{formatCurrency(totalCatalogValue)}</strong><small>Suma de precios unitarios</small></CardContent></Card>
      </section>

      <Card className="suppliers-panel"><CardContent>
        <div className="suppliers-toolbar">
          <div className="search-input-wrap"><Search size={16} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Folio, proveedor, RFC, giro, correo o teléfono" /></div>
          <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Todos</SelectItem><SelectItem value="ACTIVE">Activos</SelectItem><SelectItem value="INACTIVE">Inactivos</SelectItem></SelectContent></Select>
          <Button type="button" variant="outline" onClick={downloadTemplate}><Download size={15} /> Plantilla</Button>
          <label className="warehouse-upload-button"><Upload size={15} /> Carga masiva<input type="file" accept=".xlsx,.xls" onChange={importTemplate} /></label>
          <Button type="button" variant="outline" onClick={() => void exportExcel()}><FileSpreadsheet size={15} /> Excel</Button>
          <Button type="button" variant="outline" onClick={() => void exportPdf()}><FileDown size={15} /> PDF</Button>
          {canManage && <Button type="button" onClick={() => setSupplierDraft(emptySupplier())}><Plus size={16} /> Nuevo proveedor</Button>}
        </div>
        <div className="warehouse-table-wrap"><Table><TableHeader><TableRow><TableHead>Folio / proveedor</TableHead><TableHead>RFC / régimen</TableHead><TableHead>Giro</TableHead><TableHead>Contacto</TableHead><TableHead>Catálogo</TableHead><TableHead>Estatus</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader><TableBody>
          {filtered.map((supplier) => <TableRow key={supplier.id}>
            <TableCell><strong>{supplier.folio}</strong><small>{supplier.businessName}</small></TableCell>
            <TableCell><strong>{supplier.rfc}</strong><small>{supplier.taxRegime}</small></TableCell>
            <TableCell>{supplier.businessLine}</TableCell>
            <TableCell><span className="supplier-contact"><strong>{supplier.contactName}</strong><small><Phone size={11} /> {supplier.phone}</small><small><Mail size={11} /> {supplier.email}</small></span></TableCell>
            <TableCell><strong>{supplierItems(supplier.id).length}</strong><small>productos / insumos</small></TableCell>
            <TableCell><Badge variant="outline">{supplier.active ? "ACTIVO" : "INACTIVO"}</Badge></TableCell>
            <TableCell><div className="warehouse-row-actions"><Button size="sm" variant="outline" onClick={() => setDetailSupplier(supplier)}><Eye size={14} /></Button>{canManage && <><Button size="sm" variant="outline" onClick={() => setSupplierDraft({ ...supplier })}><Pencil size={14} /></Button><Button size="sm" variant="outline" onClick={() => onToggleSupplier(supplier.id)}>{supplier.active ? "Inactivar" : "Activar"}</Button><Button size="sm" variant="outline" onClick={() => onDeleteSupplier(supplier.id)}><Trash2 size={14} /></Button></>}</div></TableCell>
          </TableRow>)}
          {filtered.length === 0 && <TableRow><TableCell colSpan={7}>No hay proveedores para los filtros seleccionados.</TableCell></TableRow>}
        </TableBody></Table></div>
      </CardContent></Card>

      <Dialog open={Boolean(supplierDraft)} onOpenChange={(open) => !open && setSupplierDraft(null)}><DialogContent className="sm:max-w-[760px]"><DialogHeader><DialogTitle>{suppliers.some((supplier) => supplier.id === supplierDraft?.id) ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle><DialogDescription>El folio y los datos fiscales alimentarán pedidos, costos e históricos autorizados.</DialogDescription></DialogHeader>{supplierDraft && <div className="supplier-form-grid">
        <div className="field-stack"><Label>Folio proveedor</Label><Input value={supplierDraft.folio} onChange={(event) => setSupplierDraft({ ...supplierDraft, folio: event.target.value })} /></div>
        <div className="field-stack"><Label>Razón social</Label><Input value={supplierDraft.businessName} onChange={(event) => setSupplierDraft({ ...supplierDraft, businessName: event.target.value })} /></div>
        <div className="field-stack"><Label>RFC</Label><Input value={supplierDraft.rfc} onChange={(event) => setSupplierDraft({ ...supplierDraft, rfc: event.target.value.toLocaleUpperCase("es-MX") })} /></div>
        <div className="field-stack"><Label>Régimen fiscal</Label><Input value={supplierDraft.taxRegime} onChange={(event) => setSupplierDraft({ ...supplierDraft, taxRegime: event.target.value })} /></div>
        <div className="field-stack"><Label>Giro de la empresa</Label><Input value={supplierDraft.businessLine} onChange={(event) => setSupplierDraft({ ...supplierDraft, businessLine: event.target.value })} /></div>
        <div className="field-stack"><Label>Nombre de contacto</Label><Input value={supplierDraft.contactName} onChange={(event) => setSupplierDraft({ ...supplierDraft, contactName: event.target.value })} /></div>
        <div className="field-stack"><Label>Teléfono</Label><Input value={supplierDraft.phone} onChange={(event) => setSupplierDraft({ ...supplierDraft, phone: event.target.value })} /></div>
        <div className="field-stack"><Label>Correo</Label><Input type="email" value={supplierDraft.email} onChange={(event) => setSupplierDraft({ ...supplierDraft, email: event.target.value })} /></div>
        <div className="field-stack supplier-address"><Label>Dirección fiscal</Label><Textarea value={supplierDraft.address} onChange={(event) => setSupplierDraft({ ...supplierDraft, address: event.target.value })} /></div>
      </div>}<DialogFooter><Button variant="outline" onClick={() => setSupplierDraft(null)}>Cancelar</Button><Button onClick={saveSupplier} disabled={!supplierDraft?.businessName.trim() || !supplierDraft?.folio.trim() || !supplierDraft?.rfc.trim()}>Guardar proveedor</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(detailSupplier)} onOpenChange={(open) => !open && setDetailSupplier(null)}><DialogContent className="supplier-detail-dialog sm:max-w-[900px]"><DialogHeader><DialogTitle>{detailSupplier?.businessName}</DialogTitle><DialogDescription>{detailSupplier ? `${detailSupplier.folio} · ${detailSupplier.rfc} · ${detailSupplier.businessLine}` : ""}</DialogDescription></DialogHeader>{detailSupplier && <><div className="supplier-detail-contact"><span><Phone size={14} /> {detailSupplier.phone}</span><span><Mail size={14} /> {detailSupplier.email}</span><span><Building2 size={14} /> {detailSupplier.address}</span></div><div className="supplier-detail-heading"><strong>Productos, insumos y artículos</strong>{canManage && <Button size="sm" onClick={() => setItemDraft(emptyItem(detailSupplier))}><Plus size={14} /> Agregar producto</Button>}</div><div className="warehouse-table-wrap"><Table><TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead>Familia / categoría</TableHead><TableHead>Presentación</TableHead><TableHead>Costo MXN</TableHead><TableHead>Costo USD</TableHead><TableHead>Precio socio</TableHead><TableHead>Origen</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader><TableBody>{supplierItems(detailSupplier.id).map((item) => <TableRow key={item.id}><TableCell><strong>{item.name}</strong><small>{item.sku}</small></TableCell><TableCell><strong>{item.family}</strong><small>{item.category}</small></TableCell><TableCell>{item.presentation}<small>{item.units} piezas</small></TableCell><TableCell>{formatCurrency(item.costMxn)}</TableCell><TableCell>${item.costUsd.toFixed(2)}</TableCell><TableCell>{formatCurrency(item.partnerCost)}</TableCell><TableCell>{item.source}</TableCell><TableCell><div className="warehouse-row-actions"><Button size="sm" variant="outline" onClick={() => setDetailItemId(item.id)}><Eye size={14} /></Button>{item.source === "Bodega / insumo" && canManage ? <><Button size="sm" variant="outline" onClick={() => setItemDraft({ ...supplies.find((candidate) => candidate.id === item.id)! })}><Pencil size={14} /></Button><Button size="sm" variant="outline" onClick={() => onDeleteItem(item.id)}><Trash2 size={14} /></Button></> : <Badge variant="outline">Editar en Catálogo</Badge>}</div></TableCell></TableRow>)}</TableBody></Table></div></>}</DialogContent></Dialog>

      <Dialog open={Boolean(detailCatalogItem)} onOpenChange={(open) => !open && setDetailItemId(null)}><DialogContent className="sm:max-w-[520px]"><DialogHeader><DialogTitle>{detailCatalogItem?.name}</DialogTitle><DialogDescription>{detailCatalogItem ? `${detailCatalogItem.sku} · ${detailCatalogItem.source}` : ""}</DialogDescription></DialogHeader>{detailCatalogItem && <div className="supplier-item-summary"><span><small>Familia / categoría</small><strong>{detailCatalogItem.family} · {detailCatalogItem.category}</strong></span><span><small>Presentación</small><strong>{detailCatalogItem.presentation} · {detailCatalogItem.units} piezas</strong></span><span><small>Costo</small><strong>{formatCurrency(detailCatalogItem.costMxn)} · USD ${detailCatalogItem.costUsd.toFixed(2)}</strong></span><span><small>Precio socio</small><strong>{formatCurrency(detailCatalogItem.partnerCost)}</strong></span></div>}<DialogFooter><Button onClick={() => setDetailItemId(null)}>Cerrar</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(itemDraft)} onOpenChange={(open) => !open && setItemDraft(null)}><DialogContent className="sm:max-w-[800px]"><DialogHeader><DialogTitle>{supplies.some((item) => item.id === itemDraft?.id) ? "Editar producto de proveedor" : "Agregar producto de proveedor"}</DialogTitle><DialogDescription>El artículo se agregará a existencias de bodega y estará disponible en listas y resurtidos.</DialogDescription></DialogHeader>{itemDraft && <div className="supplier-item-form">
        <div className="field-stack"><Label>Proveedor</Label><Select value={itemDraft.supplierId ?? "NONE"} onValueChange={(value) => setItemDraft({ ...itemDraft, supplierId: value === "NONE" ? null : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NONE">Sin proveedor</SelectItem>{suppliers.filter((supplier) => supplier.active).map((supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.businessName}</SelectItem>)}</SelectContent></Select></div>
        <div className="field-stack"><Label>Nombre del producto</Label><Input value={itemDraft.name} onChange={(event) => setItemDraft({ ...itemDraft, name: event.target.value })} /></div>
        <div className="field-stack"><Label>SKU</Label><Input value={itemDraft.sku} onChange={(event) => setItemDraft({ ...itemDraft, sku: event.target.value.toLocaleUpperCase("es-MX") })} /></div>
        <div className="field-stack"><Label>Familia</Label><Input value={itemDraft.family} onChange={(event) => setItemDraft({ ...itemDraft, family: event.target.value })} /></div>
        <div className="field-stack"><Label>Categoría</Label><Input value={itemDraft.category} onChange={(event) => setItemDraft({ ...itemDraft, category: event.target.value })} /></div>
        <div className="field-stack"><Label>Unidad de medida</Label><Input value={itemDraft.unit} onChange={(event) => setItemDraft({ ...itemDraft, unit: event.target.value })} /></div>
        <div className="field-stack"><Label>Presentación</Label><Input value={itemDraft.presentation} onChange={(event) => setItemDraft({ ...itemDraft, presentation: event.target.value })} /></div>
        <div className="field-stack"><Label>Piezas por caja</Label><Input type="number" min="1" value={itemDraft.unitsPerPackage} onChange={(event) => setItemDraft({ ...itemDraft, unitsPerPackage: Math.max(1, Number(event.target.value) || 1) })} /></div>
        <div className="field-stack"><Label>Costo MXN</Label><Input type="number" min="0" step="0.01" value={itemDraft.costMxn} onChange={(event) => setItemDraft({ ...itemDraft, costMxn: Math.max(0, Number(event.target.value) || 0) })} /></div>
        <div className="field-stack"><Label>Costo USD</Label><Input type="number" min="0" step="0.01" value={itemDraft.costUsd} onChange={(event) => setItemDraft({ ...itemDraft, costUsd: Math.max(0, Number(event.target.value) || 0) })} /></div>
        <div className="field-stack"><Label>Precio socio</Label><Input type="number" min="0" step="0.01" value={itemDraft.partnerCost} onChange={(event) => setItemDraft({ ...itemDraft, partnerCost: Math.max(0, Number(event.target.value) || 0) })} /></div>
        <div className="field-stack"><Label>Precio sugerido</Label><Input type="number" min="0" step="0.01" value={itemDraft.retailPrice} onChange={(event) => setItemDraft({ ...itemDraft, retailPrice: Math.max(0, Number(event.target.value) || 0) })} /></div>
        <div className="field-stack"><Label>Stock mínimo</Label><Input type="number" min="0" value={itemDraft.stockMin} onChange={(event) => setItemDraft({ ...itemDraft, stockMin: Math.max(0, Number(event.target.value) || 0) })} /></div>
        <div className="field-stack"><Label>Stock máximo</Label><Input type="number" min="0" value={itemDraft.stockMax} onChange={(event) => setItemDraft({ ...itemDraft, stockMax: Math.max(0, Number(event.target.value) || 0) })} /></div>
        <div className="field-stack supplier-item-image"><Label>Imagen / URL</Label><Input value={itemDraft.image} onChange={(event) => setItemDraft({ ...itemDraft, image: event.target.value })} /></div>
      </div>}<DialogFooter><Button variant="outline" onClick={() => setItemDraft(null)}>Cancelar</Button><Button onClick={saveItem} disabled={!itemDraft?.name.trim() || !itemDraft?.sku.trim() || itemDraft.stockMax < itemDraft.stockMin}>Guardar producto</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
