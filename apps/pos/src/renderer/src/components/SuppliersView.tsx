import { useMemo, useState, type ChangeEvent } from "react";
import {
  BadgeCheck,
  Building2,
  Download,
  Eye,
  FileDown,
  FileSpreadsheet,
  LockKeyhole,
  Mail,
  PackagePlus,
  Pencil,
  Phone,
  Plus,
  Printer,
  Power,
  PowerOff,
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
  canViewCosts: boolean;
  onSaveSupplier: (supplier: WarehouseSupplier) => boolean;
  onToggleSupplier: (id: string) => void;
  onSaveItem: (item: WarehouseSupplyItem) => boolean;
  onSaveItems: (items: WarehouseSupplyItem[]) => {
    saved: number;
    errors: string[];
  };
  onDeleteItem: (id: string) => void;
}

interface SupplierCatalogItem {
  id: string;
  name: string;
  sku: string;
  family: string;
  category: string;
  presentation: string;
  units: number;
  unit: string;
  costMxn: number;
  costUsd: number;
  partnerCost: number;
  retailPrice: number;
  stockMin: number;
  stockMax: number;
  image: string;
  active: boolean;
  branchVisible: boolean;
  source: "Catálogo retail" | "Bodega / insumo";
}

const emptySupplierCatalog: SupplierCatalogItem[] = [];

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
  image: "./products/renewal-serum.png",
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

const spreadsheetNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  const normalized = String(value ?? "")
    .trim()
    .replace(/[$,]/g, "");
  return normalized === "" ? Number.NaN : Number(normalized);
};

const spreadsheetBoolean = (value: unknown, fallback: boolean) => {
  const normalized = String(value ?? "")
    .trim()
    .toLocaleLowerCase("es-MX");
  if (["sí", "si", "s", "true", "1", "activo", "visible"].includes(normalized))
    return true;
  if (["no", "n", "false", "0", "inactivo", "oculto"].includes(normalized))
    return false;
  return fallback;
};

const safeFileName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLocaleLowerCase("es-MX") || "proveedor";

const supplierProductColumns = [
  "SKU",
  "Nombre del producto",
  "Familia",
  "Categoría",
  "Unidad de medida",
  "Presentación",
  "Piezas por caja",
  "Costo MXN",
  "Costo USD",
  "Precio distribuidor",
  "Precio sugerido",
  "Stock mínimo",
  "Stock máximo",
  "Imagen URL",
  "Visible en sucursal",
  "Activo",
] as const;

const spreadsheetBooleanIsValid = (value: unknown) =>
  [
    "sí",
    "si",
    "s",
    "true",
    "1",
    "activo",
    "visible",
    "no",
    "n",
    "false",
    "0",
    "inactivo",
    "oculto",
  ].includes(
    String(value ?? "")
      .trim()
      .toLocaleLowerCase("es-MX"),
  );

export function SuppliersView({
  suppliers,
  products,
  supplies,
  canManage,
  canViewCosts,
  onSaveSupplier,
  onToggleSupplier,
  onSaveItem,
  onSaveItems,
  onDeleteItem,
}: SuppliersViewProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [supplierDraft, setSupplierDraft] = useState<WarehouseSupplier | null>(
    null,
  );
  const [itemDraft, setItemDraft] = useState<WarehouseSupplyItem | null>(null);
  const [detailSupplier, setDetailSupplier] =
    useState<WarehouseSupplier | null>(null);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [bulkImportErrors, setBulkImportErrors] = useState<string[]>([]);
  const [printSupplierId, setPrintSupplierId] = useState<string | null>(null);

  const supplierCatalogById = useMemo(() => {
    const catalog = new Map<string, SupplierCatalogItem[]>();
    const append = (supplierId: string, item: SupplierCatalogItem) => {
      catalog.set(supplierId, [...(catalog.get(supplierId) ?? []), item]);
    };
    products
      .filter((product) => product.kind === "PRODUCT" && product.supplierId)
      .forEach((product) => {
        append(product.supplierId!, {
          id: product.id,
          name: product.name,
          sku: product.sku,
          family: product.family,
          category: product.category,
          presentation: product.presentation ?? "Pieza individual",
          units: product.unitsPerPackage ?? 1,
          unit: "pieza",
          costMxn: product.costMxn,
          costUsd: product.costUsd,
          partnerCost: product.partnerCost ?? product.costMxn,
          retailPrice: product.maxPrice,
          stockMin: product.stockMin ?? 0,
          stockMax: product.stockMax ?? 0,
          image: product.image,
          active: product.active,
          branchVisible: product.branches.length > 0,
          source: "Catálogo retail",
        });
      });
    supplies
      .filter((item) => item.supplierId)
      .forEach((item) => {
        append(item.supplierId!, {
          id: item.id,
          name: item.name,
          sku: item.sku,
          family: item.family,
          category: item.category,
          presentation: item.presentation,
          units: item.unitsPerPackage,
          unit: item.unit,
          costMxn: item.costMxn,
          costUsd: item.costUsd,
          partnerCost: item.partnerCost,
          retailPrice: item.retailPrice,
          stockMin: item.stockMin,
          stockMax: item.stockMax,
          image: item.image,
          active: item.active,
          branchVisible: item.branchVisible,
          source: "Bodega / insumo",
        });
      });
    return catalog;
  }, [products, supplies]);

  const supplierItems = (supplierId: string) =>
    supplierCatalogById.get(supplierId) ?? emptySupplierCatalog;

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-MX");
    return suppliers.filter((supplier) => {
      if (status === "ACTIVE" && !supplier.active) return false;
      if (status === "INACTIVE" && supplier.active) return false;
      if (!query) return true;
      return [
        supplier.folio,
        supplier.businessName,
        supplier.contactName,
        supplier.rfc,
        supplier.businessLine,
        supplier.email,
        supplier.phone,
      ].some((value) => value.toLocaleLowerCase("es-MX").includes(query));
    });
  }, [search, status, suppliers]);

  const totalCatalogItems = suppliers.reduce(
    (sum, supplier) => sum + supplierItems(supplier.id).length,
    0,
  );
  const totalCatalogValue =
    supplies.reduce((sum, item) => sum + item.partnerCost, 0) +
    products
      .filter((product) => product.kind === "PRODUCT")
      .reduce(
        (sum, product) => sum + (product.partnerCost ?? product.costMxn),
        0,
      );
  const detailCatalogItem =
    detailSupplier && detailItemId
      ? (supplierItems(detailSupplier.id).find(
          (item) => item.id === detailItemId,
        ) ?? null)
      : null;
  const printSupplier = printSupplierId
    ? (suppliers.find((supplier) => supplier.id === printSupplierId) ?? null)
    : null;
  const printSupplierItems = printSupplier
    ? supplierItems(printSupplier.id)
    : [];

  const saveSupplier = () => {
    if (!supplierDraft || !onSaveSupplier(supplierDraft)) return;
    setSupplierDraft(null);
  };

  const saveItem = () => {
    if (!itemDraft) return;
    const supplier = suppliers.find(
      (candidate) => candidate.id === itemDraft.supplierId,
    );
    const normalized = {
      ...itemDraft,
      supplierName: supplier?.businessName ?? null,
    };
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
    const itemRows = filtered.flatMap((supplier) =>
      supplierItems(supplier.id).map((item) => ({
        Proveedor: supplier.businessName,
        Folio: supplier.folio,
        SKU: item.sku,
        Producto: item.name,
        Familia: item.family,
        Categoría: item.category,
        Presentación: item.presentation,
        "Piezas por caja": item.units,
        ...(canViewCosts
          ? {
              "Costo MXN": item.costMxn,
              "Costo USD": item.costUsd,
              "Precio distribuidor": item.partnerCost,
            }
          : {}),
        Origen: item.source,
      })),
    );
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet(supplierRows),
      "Proveedores",
    );
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet(itemRows),
      "Productos",
    );
    XLSX.writeFile(
      book,
      `proveedores-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const exportPdf = async () => {
    const [{ jsPDF }, { autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
      orientation: "landscape",
    });
    doc.setFontSize(18);
    doc.text("KEYSAR · DIRECTORIO DE PROVEEDORES", 38, 42);
    doc.setFontSize(9);
    doc.text(
      `${filtered.length} proveedores · ${totalCatalogItems} productos vinculados`,
      38,
      59,
    );
    autoTable(doc, {
      startY: 74,
      head: [
        [
          "Folio",
          "Proveedor",
          "RFC",
          "Giro",
          "Contacto",
          "Teléfono",
          "Correo",
          "Productos",
          "Estatus",
        ],
      ],
      body: filtered.map((supplier) => [
        supplier.folio,
        supplier.businessName,
        supplier.rfc,
        supplier.businessLine,
        supplier.contactName,
        supplier.phone,
        supplier.email,
        supplierItems(supplier.id).length,
        supplier.active ? "Activo" : "Inactivo",
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [109, 82, 61] },
    });
    doc.save(`proveedores-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.json_to_sheet([
      {
        "Razón social": "Proveedor ejemplo",
        RFC: "XAXX010101000",
        "Régimen fiscal": "601",
        Giro: "Insumos",
        Contacto: "Nombre",
        Teléfono: "",
        Correo: "",
        Dirección: "",
      },
    ]);
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
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });
      let created = 0;
      rows.forEach((row, index) => {
        const businessName = String(row["Razón social"] ?? "").trim();
        if (!businessName) return;
        const supplier: WarehouseSupplier = {
          ...emptySupplier(),
          id: `supplier-import-${crypto.randomUUID()}`,
          folio: `PROV-IMP-${String(index + 1).padStart(3, "0")}`,
          businessName,
          rfc: String(row.RFC ?? "")
            .trim()
            .toLocaleUpperCase("es-MX"),
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

  const downloadProductTemplate = async (supplier: WarehouseSupplier) => {
    const XLSX = await import("xlsx");
    const rows = [
      {
        SKU: "PROD-EJEMPLO-001",
        "Nombre del producto": "Producto ejemplo",
        Familia: "Cuidado facial",
        Categoría: "Hidratación",
        "Unidad de medida": "pieza",
        Presentación: "Caja con 12 piezas",
        "Piezas por caja": 12,
        "Costo MXN": 100,
        "Costo USD": 5.5,
        "Precio distribuidor": 125,
        "Precio sugerido": 180,
        "Stock mínimo": 10,
        "Stock máximo": 40,
        "Imagen URL": "./products/renewal-serum.png",
        "Visible en sucursal": "Sí",
        Activo: "Sí",
      },
    ];
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [
      { wch: 20 },
      { wch: 28 },
      { wch: 20 },
      { wch: 20 },
      { wch: 18 },
      { wch: 24 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 15 },
      { wch: 17 },
      { wch: 15 },
      { wch: 15 },
      { wch: 34 },
      { wch: 20 },
      { wch: 12 },
    ];
    sheet["!autofilter"] = { ref: "A1:P2" };
    const instructions = XLSX.utils.aoa_to_sheet([
      ["Alta masiva de productos de proveedor"],
      ["Proveedor", supplier.businessName],
      ["Folio", supplier.folio],
      [
        "Regla",
        "No cambies los encabezados. Cada fila representa un producto nuevo.",
      ],
      [
        "Obligatorios",
        "Todos los campos de la hoja Productos. Los importes y stocks deben ser numéricos.",
      ],
      [
        "SKU",
        "Debe ser único en Catálogo, Inventario y dentro del mismo archivo.",
      ],
      ["Visible / Activo", "Usa Sí o No."],
      [
        "Resultado",
        "La carga se rechaza completa si una fila tiene datos faltantes o inválidos.",
      ],
    ]);
    instructions["!cols"] = [{ wch: 20 }, { wch: 90 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Productos");
    XLSX.utils.book_append_sheet(book, instructions, "Instrucciones");
    XLSX.writeFile(
      book,
      `plantilla-productos-${safeFileName(supplier.businessName)}.xlsx`,
    );
  };

  const importSupplierProducts = async (
    supplier: WarehouseSupplier,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet =
        workbook.Sheets["Productos"] ??
        workbook.Sheets[workbook.SheetNames[0] ?? ""];
      if (!sheet) throw new Error("No se encontró la hoja Productos.");
      const importedRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        sheet,
        {
          defval: "",
        },
      );
      const rows: Array<Record<string, unknown>> = importedRows.map((row) => ({
        ...row,
        "Precio distribuidor":
          row["Precio distribuidor"] || row["Precio socio"] || "",
      }));
      if (rows.length === 0) {
        setBulkImportErrors(["El archivo no contiene filas de productos."]);
        return;
      }
      const sourceErrors = rows.flatMap((row, index) => {
        const rowNumber = index + 2;
        const missing = supplierProductColumns.filter(
          (column) => String(row[column] ?? "").trim() === "",
        );
        const errors =
          missing.length > 0
            ? [`Fila ${rowNumber}: faltan ${missing.join(", ")}.`]
            : [];
        if (
          !spreadsheetBooleanIsValid(row["Visible en sucursal"]) ||
          !spreadsheetBooleanIsValid(row.Activo)
        ) {
          errors.push(
            `Fila ${rowNumber}: Visible en sucursal y Activo deben indicar Sí o No.`,
          );
        }
        return errors;
      });
      if (sourceErrors.length > 0) {
        setBulkImportErrors(sourceErrors);
        toast.error("La carga no se realizó porque faltan datos obligatorios.");
        return;
      }
      const items = rows.map((row) => ({
        ...emptyItem(supplier),
        id: `supply-import-${crypto.randomUUID()}`,
        sku: String(row.SKU ?? "")
          .trim()
          .toLocaleUpperCase("es-MX"),
        name: String(row["Nombre del producto"] ?? "").trim(),
        family: String(row.Familia ?? "").trim(),
        category: String(row.Categoría ?? "").trim(),
        unit: String(row["Unidad de medida"] ?? "").trim(),
        presentation: String(row.Presentación ?? "").trim(),
        unitsPerPackage: spreadsheetNumber(row["Piezas por caja"]),
        costMxn: spreadsheetNumber(row["Costo MXN"]),
        costUsd: spreadsheetNumber(row["Costo USD"]),
        partnerCost: spreadsheetNumber(row["Precio distribuidor"]),
        retailPrice: spreadsheetNumber(row["Precio sugerido"]),
        stockMin: spreadsheetNumber(row["Stock mínimo"]),
        stockMax: spreadsheetNumber(row["Stock máximo"]),
        image: String(row["Imagen URL"] ?? "").trim(),
        branchVisible: spreadsheetBoolean(row["Visible en sucursal"], true),
        active: spreadsheetBoolean(row.Activo, true),
      }));
      const result = onSaveItems(items);
      setBulkImportErrors(result.errors);
      if (result.errors.length > 0) {
        toast.error(
          `La carga no se realizó. Corrige ${result.errors.length} ${result.errors.length === 1 ? "error" : "errores"} del archivo.`,
        );
        return;
      }
    } catch {
      setBulkImportErrors([
        "No fue posible leer el archivo. Usa la plantilla descargada desde este proveedor.",
      ]);
      toast.error("No fue posible leer la lista de productos del proveedor.");
    }
  };

  const exportSupplierExcel = async (supplier: WarehouseSupplier) => {
    const XLSX = await import("xlsx");
    const items = supplierItems(supplier.id);
    const headers = [
      "SKU",
      "Producto",
      "Familia",
      "Categoría",
      "Unidad",
      "Presentación",
      "Piezas por caja",
      ...(canViewCosts
        ? ["Costo MXN", "Costo USD", "Precio distribuidor", "Precio sugerido"]
        : []),
      "Stock mínimo",
      "Stock máximo",
      "Visible en sucursal",
      "Estatus",
      "Origen",
    ];
    const data = items.map((item) => [
      item.sku,
      item.name,
      item.family,
      item.category,
      item.unit,
      item.presentation,
      item.units,
      ...(canViewCosts
        ? [item.costMxn, item.costUsd, item.partnerCost, item.retailPrice]
        : []),
      item.stockMin,
      item.stockMax,
      item.branchVisible ? "Sí" : "No",
      item.active ? "ACTIVO" : "INACTIVO",
      item.source,
    ]);
    const book = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    sheet["!cols"] = headers.map((header) => ({
      wch: Math.max(14, Math.min(32, header.length + 5)),
    }));
    sheet["!autofilter"] = {
      ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}${Math.max(1, data.length + 1)}`,
    };
    XLSX.utils.book_append_sheet(book, sheet, "Lista de precios");
    XLSX.writeFile(
      book,
      `lista-precios-${safeFileName(supplier.businessName)}.xlsx`,
    );
  };

  const exportSupplierPdf = async (supplier: WarehouseSupplier) => {
    const [{ jsPDF }, { autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const items = supplierItems(supplier.id);
    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
      orientation: "landscape",
    });
    doc.setFontSize(18);
    doc.text(`LISTA DE PRECIOS · ${supplier.businessName}`, 38, 42);
    doc.setFontSize(8);
    doc.text(
      `${supplier.folio} · RFC ${supplier.rfc} · ${supplier.contactName} · ${supplier.phone} · ${supplier.email}`,
      38,
      58,
    );
    autoTable(doc, {
      startY: 72,
      head: [
        [
          "SKU",
          "Producto",
          "Familia / categoría",
          "Presentación",
          ...(canViewCosts
            ? [
                "Costo MXN",
                "Costo USD",
                "Precio distribuidor",
                "Precio sugerido",
              ]
            : []),
          "Stock mín./máx.",
          "Estatus",
        ],
      ],
      body: items.map((item) => [
        item.sku,
        item.name,
        `${item.family} / ${item.category}`,
        `${item.presentation} · ${item.units} pz`,
        ...(canViewCosts
          ? [
              formatCurrency(item.costMxn),
              `$${item.costUsd.toFixed(2)}`,
              formatCurrency(item.partnerCost),
              formatCurrency(item.retailPrice),
            ]
          : []),
        `${item.stockMin} / ${item.stockMax}`,
        item.active ? "Activo" : "Inactivo",
      ]),
      styles: { fontSize: 6.5 },
      headStyles: { fillColor: [46, 39, 34] },
    });
    doc.save(`lista-precios-${safeFileName(supplier.businessName)}.pdf`);
  };

  const printSupplierCatalog = (supplier: WarehouseSupplier) => {
    setPrintSupplierId(supplier.id);
    window.setTimeout(() => {
      document.body.classList.add("supplier-catalog-printing");
      const cleanup = () => {
        document.body.classList.remove("supplier-catalog-printing");
        setPrintSupplierId(null);
      };
      window.addEventListener("afterprint", cleanup, { once: true });
      window.print();
      window.setTimeout(cleanup, 500);
    }, 0);
  };

  return (
    <div className="suppliers-view view-stack">
      <section className="suppliers-hero">
        <div>
          <span className="section-kicker">ABASTECIMIENTO Y COMPRAS</span>
          <h2>Lista de proveedores</h2>
          <p>
            Datos fiscales, contactos y catálogo vinculado a inventario y
            bodega.
          </p>
        </div>
        <Badge variant="outline">
          <BadgeCheck size={14} /> Acceso autorizado
        </Badge>
      </section>

      <section className="suppliers-metrics">
        <Card>
          <CardContent className="supplier-metric-content">
            <Building2 size={20} />
            <span>PROVEEDORES ACTIVOS</span>
            <strong>
              {suppliers.filter((supplier) => supplier.active).length}
            </strong>
            <small>{suppliers.length} registros</small>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="supplier-metric-content">
            <PackagePlus size={20} />
            <span>ARTÍCULOS VINCULADOS</span>
            <strong>{totalCatalogItems}</strong>
            <small>Retail, insumos y artículos</small>
          </CardContent>
        </Card>
        {canViewCosts ? (
          <Card>
            <CardContent className="supplier-metric-content">
              <BadgeCheck size={20} />
              <span>VALOR CATÁLOGO SOCIO</span>
              <strong>{formatCurrency(totalCatalogValue)}</strong>
              <small>Suma de precios unitarios</small>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="supplier-metric-content">
              <LockKeyhole size={20} />
              <span>COSTOS PROTEGIDOS</span>
              <strong>OCULTOS</strong>
              <small>Requiere permiso por rol</small>
            </CardContent>
          </Card>
        )}
      </section>

      <Card className="suppliers-panel">
        <CardContent>
          <div className="suppliers-toolbar">
            <div className="search-input-wrap">
              <Search size={16} />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Folio, proveedor, RFC, giro, correo o teléfono"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="ACTIVE">Activos</SelectItem>
                <SelectItem value="INACTIVE">Inactivos</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={downloadTemplate}>
              <Download size={15} /> Plantilla
            </Button>
            <label className="warehouse-upload-button">
              <Upload size={15} /> Carga masiva
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={importTemplate}
              />
            </label>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="icon-action-button"
              onClick={() => void exportExcel()}
              aria-label="Descargar proveedores en Excel"
              title="Excel"
            >
              <FileSpreadsheet size={15} />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="icon-action-button"
              onClick={() => void exportPdf()}
              aria-label="Descargar proveedores en PDF"
              title="PDF"
            >
              <FileDown size={15} />
            </Button>
            {canManage && (
              <Button
                type="button"
                onClick={() => setSupplierDraft(emptySupplier())}
              >
                <Plus size={16} /> Nuevo proveedor
              </Button>
            )}
          </div>
          <div className="warehouse-table-wrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio / proveedor</TableHead>
                  <TableHead>RFC / régimen</TableHead>
                  <TableHead>Giro</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Catálogo</TableHead>
                  <TableHead>Estatus</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <strong>{supplier.folio}</strong>
                      <small>{supplier.businessName}</small>
                    </TableCell>
                    <TableCell>
                      <strong>{supplier.rfc}</strong>
                      <small>{supplier.taxRegime}</small>
                    </TableCell>
                    <TableCell>{supplier.businessLine}</TableCell>
                    <TableCell>
                      <span className="supplier-contact">
                        <strong>{supplier.contactName}</strong>
                        <small>
                          <Phone size={11} /> {supplier.phone}
                        </small>
                        <small>
                          <Mail size={11} /> {supplier.email}
                        </small>
                      </span>
                    </TableCell>
                    <TableCell>
                      <strong>{supplierItems(supplier.id).length}</strong>
                      <small>productos / insumos</small>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {supplier.active ? "ACTIVO" : "INACTIVO"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="warehouse-row-actions">
                        <Button
                          size="icon"
                          variant="outline"
                          className="icon-action-button"
                          onClick={() => setDetailSupplier(supplier)}
                          aria-label={`Visualizar ${supplier.businessName}`}
                          title="Visualizar"
                        >
                          <Eye size={15} />
                        </Button>
                        {canManage && (
                          <>
                            <Button
                              size="icon"
                              variant="outline"
                              className="icon-action-button"
                              onClick={() => setSupplierDraft({ ...supplier })}
                              aria-label={`Editar ${supplier.businessName}`}
                              title="Editar"
                            >
                              <Pencil size={15} />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="icon-action-button"
                              onClick={() => onToggleSupplier(supplier.id)}
                              aria-label={`${supplier.active ? "Dar de baja" : "Reactivar"} ${supplier.businessName}`}
                              title={
                                supplier.active ? "Dar de baja" : "Reactivar"
                              }
                            >
                              {supplier.active ? (
                                <PowerOff size={15} />
                              ) : (
                                <Power size={15} />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      No hay proveedores para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(supplierDraft)}
        onOpenChange={(open) => !open && setSupplierDraft(null)}
      >
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>
              {suppliers.some((supplier) => supplier.id === supplierDraft?.id)
                ? "Editar proveedor"
                : "Nuevo proveedor"}
            </DialogTitle>
            <DialogDescription>
              Los cambios aplican a operaciones nuevas. Órdenes, precios y
              movimientos anteriores conservarán la información registrada en su
              fecha original.
            </DialogDescription>
          </DialogHeader>
          {supplierDraft && (
            <div className="supplier-form-grid">
              <div className="field-stack">
                <Label>Folio proveedor</Label>
                <Input
                  value={supplierDraft.folio}
                  onChange={(event) =>
                    setSupplierDraft({
                      ...supplierDraft,
                      folio: event.target.value,
                    })
                  }
                />
              </div>
              <div className="field-stack">
                <Label>Razón social</Label>
                <Input
                  value={supplierDraft.businessName}
                  onChange={(event) =>
                    setSupplierDraft({
                      ...supplierDraft,
                      businessName: event.target.value,
                    })
                  }
                />
              </div>
              <div className="field-stack">
                <Label>RFC</Label>
                <Input
                  value={supplierDraft.rfc}
                  onChange={(event) =>
                    setSupplierDraft({
                      ...supplierDraft,
                      rfc: event.target.value.toLocaleUpperCase("es-MX"),
                    })
                  }
                />
              </div>
              <div className="field-stack">
                <Label>Régimen fiscal</Label>
                <Input
                  value={supplierDraft.taxRegime}
                  onChange={(event) =>
                    setSupplierDraft({
                      ...supplierDraft,
                      taxRegime: event.target.value,
                    })
                  }
                />
              </div>
              <div className="field-stack">
                <Label>Giro de la empresa</Label>
                <Input
                  value={supplierDraft.businessLine}
                  onChange={(event) =>
                    setSupplierDraft({
                      ...supplierDraft,
                      businessLine: event.target.value,
                    })
                  }
                />
              </div>
              <div className="field-stack">
                <Label>Nombre de contacto</Label>
                <Input
                  value={supplierDraft.contactName}
                  onChange={(event) =>
                    setSupplierDraft({
                      ...supplierDraft,
                      contactName: event.target.value,
                    })
                  }
                />
              </div>
              <div className="field-stack">
                <Label>Teléfono</Label>
                <Input
                  value={supplierDraft.phone}
                  onChange={(event) =>
                    setSupplierDraft({
                      ...supplierDraft,
                      phone: event.target.value,
                    })
                  }
                />
              </div>
              <div className="field-stack">
                <Label>Correo</Label>
                <Input
                  type="email"
                  value={supplierDraft.email}
                  onChange={(event) =>
                    setSupplierDraft({
                      ...supplierDraft,
                      email: event.target.value,
                    })
                  }
                />
              </div>
              <div className="field-stack supplier-address">
                <Label>Dirección fiscal</Label>
                <Textarea
                  value={supplierDraft.address}
                  onChange={(event) =>
                    setSupplierDraft({
                      ...supplierDraft,
                      address: event.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierDraft(null)}>
              Cancelar
            </Button>
            <Button
              onClick={saveSupplier}
              disabled={
                !supplierDraft?.businessName.trim() ||
                !supplierDraft?.folio.trim() ||
                !supplierDraft?.rfc.trim()
              }
            >
              Guardar proveedor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(detailSupplier)}
        onOpenChange={(open) => !open && setDetailSupplier(null)}
      >
        <DialogContent className="supplier-detail-dialog sm:max-w-[1100px]">
          <DialogHeader>
            <DialogTitle>{detailSupplier?.businessName}</DialogTitle>
            <DialogDescription>
              {detailSupplier
                ? `${detailSupplier.folio} · ${detailSupplier.rfc} · ${detailSupplier.businessLine}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {detailSupplier && (
            <>
              <div className="supplier-detail-contact">
                <span>
                  <Phone size={14} /> {detailSupplier.phone}
                </span>
                <span>
                  <Mail size={14} /> {detailSupplier.email}
                </span>
                <span>
                  <Building2 size={14} /> {detailSupplier.address}
                </span>
              </div>
              <div className="supplier-detail-heading">
                <strong>Productos, insumos y artículos</strong>
                <div className="supplier-detail-actions">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="icon-action-button"
                    onClick={() => printSupplierCatalog(detailSupplier)}
                    aria-label="Imprimir lista de precios"
                    title="Imprimir"
                  >
                    <Printer size={15} />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="icon-action-button"
                    onClick={() => void exportSupplierPdf(detailSupplier)}
                    aria-label="Descargar lista en PDF"
                    title="Descargar PDF"
                  >
                    <FileDown size={15} />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="icon-action-button"
                    onClick={() => void exportSupplierExcel(detailSupplier)}
                    aria-label="Descargar lista en Excel"
                    title="Descargar Excel"
                  >
                    <FileSpreadsheet size={15} />
                  </Button>
                  {canManage && canViewCosts && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void downloadProductTemplate(detailSupplier)
                        }
                      >
                        <Download size={14} /> Plantilla productos
                      </Button>
                      <label className="warehouse-upload-button">
                        <Upload size={14} /> Alta masiva
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={(event) =>
                            void importSupplierProducts(detailSupplier, event)
                          }
                        />
                      </label>
                    </>
                  )}
                  {canManage && (
                    <Button
                      size="sm"
                      onClick={() => setItemDraft(emptyItem(detailSupplier))}
                    >
                      <Plus size={14} /> Agregar producto
                    </Button>
                  )}
                </div>
              </div>
              <div className="warehouse-table-wrap">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artículo</TableHead>
                      <TableHead>Familia / categoría</TableHead>
                      <TableHead>Presentación</TableHead>
                      {canViewCosts && (
                        <>
                          <TableHead>Costo MXN</TableHead>
                          <TableHead>Costo USD</TableHead>
                          <TableHead>Precio distribuidor</TableHead>
                          <TableHead>Precio sugerido</TableHead>
                        </>
                      )}
                      <TableHead>Origen</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierItems(detailSupplier.id).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <strong>{item.name}</strong>
                          <small>{item.sku}</small>
                        </TableCell>
                        <TableCell>
                          <strong>{item.family}</strong>
                          <small>{item.category}</small>
                        </TableCell>
                        <TableCell>
                          {item.presentation}
                          <small>
                            {item.units} piezas · {item.unit}
                          </small>
                        </TableCell>
                        {canViewCosts && (
                          <>
                            <TableCell>
                              {formatCurrency(item.costMxn)}
                            </TableCell>
                            <TableCell>${item.costUsd.toFixed(2)}</TableCell>
                            <TableCell>
                              {formatCurrency(item.partnerCost)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(item.retailPrice)}
                            </TableCell>
                          </>
                        )}
                        <TableCell>{item.source}</TableCell>
                        <TableCell>
                          <div className="warehouse-row-actions">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDetailItemId(item.id)}
                              aria-label={`Visualizar ${item.name}`}
                              title="Visualizar"
                            >
                              <Eye size={14} />
                            </Button>
                            {item.source === "Bodega / insumo" && canManage ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setItemDraft({
                                      ...supplies.find(
                                        (candidate) => candidate.id === item.id,
                                      )!,
                                    })
                                  }
                                  aria-label={`Editar ${item.name}`}
                                  title="Editar"
                                >
                                  <Pencil size={14} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onDeleteItem(item.id)}
                                  aria-label={`Eliminar ${item.name}`}
                                  title="Eliminar"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </>
                            ) : (
                              <Badge variant="outline">
                                Editar en Catálogo
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {supplierItems(detailSupplier.id).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={canViewCosts ? 9 : 5}>
                          Este proveedor todavía no tiene productos registrados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(detailCatalogItem)}
        onOpenChange={(open) => !open && setDetailItemId(null)}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{detailCatalogItem?.name}</DialogTitle>
            <DialogDescription>
              {detailCatalogItem
                ? `${detailCatalogItem.sku} · ${detailCatalogItem.source}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {detailCatalogItem && (
            <div className="supplier-item-summary">
              <span>
                <small>Familia / categoría</small>
                <strong>
                  {detailCatalogItem.family} · {detailCatalogItem.category}
                </strong>
              </span>
              <span>
                <small>Presentación</small>
                <strong>
                  {detailCatalogItem.presentation} · {detailCatalogItem.units}{" "}
                  piezas
                </strong>
              </span>
              {canViewCosts ? (
                <>
                  <span>
                    <small>Costo</small>
                    <strong>
                      {formatCurrency(detailCatalogItem.costMxn)} · USD $
                      {detailCatalogItem.costUsd.toFixed(2)}
                    </strong>
                  </span>
                  <span>
                    <small>Precio distribuidor</small>
                    <strong>
                      {formatCurrency(detailCatalogItem.partnerCost)}
                    </strong>
                  </span>
                </>
              ) : (
                <span>
                  <small>Costos</small>
                  <strong>Protegidos por rol</strong>
                </span>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailItemId(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(itemDraft)}
        onOpenChange={(open) => !open && setItemDraft(null)}
      >
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>
              {supplies.some((item) => item.id === itemDraft?.id)
                ? "Editar producto de proveedor"
                : "Agregar producto de proveedor"}
            </DialogTitle>
            <DialogDescription>
              El artículo estará disponible para compras futuras. Actualizar sus
              costos no modifica órdenes ni movimientos anteriores.
            </DialogDescription>
          </DialogHeader>
          {itemDraft && (
            <div className="supplier-item-form">
              <div className="field-stack">
                <Label>Proveedor</Label>
                <Select
                  value={itemDraft.supplierId ?? "NONE"}
                  onValueChange={(value) =>
                    setItemDraft({
                      ...itemDraft,
                      supplierId: value === "NONE" ? null : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Sin proveedor</SelectItem>
                    {suppliers
                      .filter((supplier) => supplier.active)
                      .map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.businessName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="field-stack">
                <Label>Nombre del producto</Label>
                <Input
                  value={itemDraft.name}
                  onChange={(event) =>
                    setItemDraft({ ...itemDraft, name: event.target.value })
                  }
                />
              </div>
              <div className="field-stack">
                <Label>SKU</Label>
                <Input
                  value={itemDraft.sku}
                  onChange={(event) =>
                    setItemDraft({
                      ...itemDraft,
                      sku: event.target.value.toLocaleUpperCase("es-MX"),
                    })
                  }
                />
              </div>
              <div className="field-stack">
                <Label>Familia</Label>
                <Input
                  value={itemDraft.family}
                  onChange={(event) =>
                    setItemDraft({ ...itemDraft, family: event.target.value })
                  }
                />
              </div>
              <div className="field-stack">
                <Label>Categoría</Label>
                <Input
                  value={itemDraft.category}
                  onChange={(event) =>
                    setItemDraft({ ...itemDraft, category: event.target.value })
                  }
                />
              </div>
              <div className="field-stack">
                <Label>Unidad de medida</Label>
                <Input
                  value={itemDraft.unit}
                  onChange={(event) =>
                    setItemDraft({ ...itemDraft, unit: event.target.value })
                  }
                />
              </div>
              <div className="field-stack">
                <Label>Presentación</Label>
                <Input
                  value={itemDraft.presentation}
                  onChange={(event) =>
                    setItemDraft({
                      ...itemDraft,
                      presentation: event.target.value,
                    })
                  }
                />
              </div>
              <div className="field-stack">
                <Label>Piezas por caja</Label>
                <Input
                  type="number"
                  min="1"
                  value={itemDraft.unitsPerPackage}
                  onChange={(event) =>
                    setItemDraft({
                      ...itemDraft,
                      unitsPerPackage: Math.max(
                        1,
                        Number(event.target.value) || 1,
                      ),
                    })
                  }
                />
              </div>
              {canViewCosts && (
                <div className="field-stack">
                  <Label>Costo MXN</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemDraft.costMxn}
                    onChange={(event) =>
                      setItemDraft({
                        ...itemDraft,
                        costMxn: Math.max(0, Number(event.target.value) || 0),
                      })
                    }
                  />
                </div>
              )}
              {canViewCosts && (
                <div className="field-stack">
                  <Label>Costo USD</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemDraft.costUsd}
                    onChange={(event) =>
                      setItemDraft({
                        ...itemDraft,
                        costUsd: Math.max(0, Number(event.target.value) || 0),
                      })
                    }
                  />
                </div>
              )}
              {canViewCosts && (
                <div className="field-stack">
                  <Label>Precio distribuidor</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemDraft.partnerCost}
                    onChange={(event) =>
                      setItemDraft({
                        ...itemDraft,
                        partnerCost: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      })
                    }
                  />
                </div>
              )}
              <div className="field-stack">
                <Label>Precio sugerido</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemDraft.retailPrice}
                  onChange={(event) =>
                    setItemDraft({
                      ...itemDraft,
                      retailPrice: Math.max(0, Number(event.target.value) || 0),
                    })
                  }
                />
              </div>
              <div className="field-stack">
                <Label>Stock mínimo</Label>
                <Input
                  type="number"
                  min="0"
                  value={itemDraft.stockMin}
                  onChange={(event) =>
                    setItemDraft({
                      ...itemDraft,
                      stockMin: Math.max(0, Number(event.target.value) || 0),
                    })
                  }
                />
              </div>
              <div className="field-stack">
                <Label>Stock máximo</Label>
                <Input
                  type="number"
                  min="0"
                  value={itemDraft.stockMax}
                  onChange={(event) =>
                    setItemDraft({
                      ...itemDraft,
                      stockMax: Math.max(0, Number(event.target.value) || 0),
                    })
                  }
                />
              </div>
              <div className="field-stack supplier-item-image">
                <Label>Imagen / URL</Label>
                <Input
                  value={itemDraft.image}
                  onChange={(event) =>
                    setItemDraft({ ...itemDraft, image: event.target.value })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDraft(null)}>
              Cancelar
            </Button>
            <Button
              onClick={saveItem}
              disabled={
                !itemDraft?.name.trim() ||
                !itemDraft?.sku.trim() ||
                itemDraft.stockMax < itemDraft.stockMin
              }
            >
              Guardar producto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkImportErrors.length > 0}
        onOpenChange={(open) => !open && setBulkImportErrors([])}
      >
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Revisa la lista de productos</DialogTitle>
            <DialogDescription>
              No se dio de alta ningún producto. Corrige el archivo y vuelve a
              cargarlo.
            </DialogDescription>
          </DialogHeader>
          <div className="supplier-import-errors">
            {bulkImportErrors.slice(0, 12).map((error) => (
              <p key={error}>{error}</p>
            ))}
            {bulkImportErrors.length > 12 && (
              <strong>
                Hay {bulkImportErrors.length - 12} errores adicionales.
              </strong>
            )}
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setBulkImportErrors([])}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printSupplier && (
        <section className="supplier-print-sheet" aria-hidden="true">
          <header>
            <h1>Lista de precios de proveedor</h1>
            <h2>{printSupplier.businessName}</h2>
            <p>
              {printSupplier.folio} · RFC {printSupplier.rfc} ·{" "}
              {printSupplier.businessLine}
            </p>
            <p>
              {printSupplier.contactName} · {printSupplier.phone} ·{" "}
              {printSupplier.email}
            </p>
          </header>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Familia / categoría</th>
                <th>Presentación</th>
                {canViewCosts && (
                  <>
                    <th>Costo MXN</th>
                    <th>Costo USD</th>
                    <th>Precio distribuidor</th>
                    <th>Precio sugerido</th>
                  </>
                )}
                <th>Stock</th>
                <th>Estatus</th>
              </tr>
            </thead>
            <tbody>
              {printSupplierItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.sku}</td>
                  <td>{item.name}</td>
                  <td>
                    {item.family}
                    <br />
                    {item.category}
                  </td>
                  <td>
                    {item.presentation}
                    <br />
                    {item.units} {item.unit}
                  </td>
                  {canViewCosts && (
                    <>
                      <td>{formatCurrency(item.costMxn)}</td>
                      <td>${item.costUsd.toFixed(2)}</td>
                      <td>{formatCurrency(item.partnerCost)}</td>
                      <td>{formatCurrency(item.retailPrice)}</td>
                    </>
                  )}
                  <td>
                    {item.stockMin} / {item.stockMax}
                  </td>
                  <td>{item.active ? "Activo" : "Inactivo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <footer>
            {printSupplierItems.length} productos · Impreso{" "}
            {new Intl.DateTimeFormat("es-MX", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date())}
          </footer>
        </section>
      )}
    </div>
  );
}
