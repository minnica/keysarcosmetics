import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  FolderPlus,
  ImagePlus,
  Layers3,
  LockKeyhole,
  PackagePlus,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  ShieldCheck,
  Store,
  Tags,
  WandSparkles,
} from "lucide-react";
import {
  Badge,
  Button,
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
import { formatCurrency, getSellerSku } from "../mock-data";
import { calculateIncludedVat } from "../tax";
import type {
  BranchInventory,
  InventoryBranchOrderDraft,
  InventoryBranchOrderResult,
  Product,
  ProductKind,
} from "../types";
import { InventoryOrderDialog } from "./InventoryOrderDialog";
import {
  compareTableValues,
  SortableTableHead,
  type TableSortDirection,
} from "./SortableTableHead";

interface CatalogViewProps {
  products: Product[];
  branchInventory: BranchInventory;
  families: string[];
  categories: string[];
  groups: string[];
  onSave: (product: Product) => void;
  onStatusChange: (productId: string, active: boolean) => void;
  onAddFamily: (name: string) => void;
  onAddCategory: (name: string) => void;
  onAddGroup: (name: string) => void;
  costAccessAuthorized: boolean;
  onAuthorizeCostAccess: (code: string) => boolean;
  isMasterCode: (code: string) => boolean;
  onCreateInventoryOrders: (
    orders: InventoryBranchOrderDraft[],
    authorizationCode: string,
  ) => InventoryBranchOrderResult[] | null;
  onLockCostAccess: () => void;
}

type AddOptionType = "family" | "category" | "group";
type SkuMode = "AUTO" | "INTERNAL";
type CatalogStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type StockTrafficTone = "is-low" | "is-healthy" | "is-over";
type InventorySortKey =
  | "product"
  | "taxonomy"
  | "prices"
  | "stock"
  | "branches"
  | "status";

const getStockTrafficTone = (
  stock: number,
  minimum: number | null,
  maximum: number | null,
): StockTrafficTone => {
  const safeMinimum = minimum ?? 0;
  const safeMaximum = maximum ?? Number.POSITIVE_INFINITY;
  if (stock < safeMinimum) return "is-low";
  if (stock > safeMaximum) return "is-over";
  return "is-healthy";
};

const createDraft = (): Product => ({
  id: `product-${Date.now()}`,
  name: "",
  sku: "",
  family: "",
  category: "",
  group: "",
  kind: "PRODUCT",
  image: "/products/renewal-serum.png",
  description: "",
  benefits: [],
  showInDigitalCatalog: true,
  minPrice: 0,
  maxPrice: 0,
  includesVat: false,
  costUsd: 0,
  costMxn: 0,
  partnerCost: 0,
  testerOrderEnabled: false,
  stock: 0,
  stockMin: 0,
  stockMax: 0,
  branches: ["Polanco"],
  active: true,
});

export function CatalogView({
  products,
  branchInventory,
  families,
  categories,
  groups,
  onSave,
  onStatusChange,
  onAddFamily,
  onAddCategory,
  onAddGroup,
  costAccessAuthorized,
  onAuthorizeCostAccess,
  isMasterCode,
  onCreateInventoryOrders,
  onLockCostAccess,
}: CatalogViewProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<CatalogStatusFilter>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Product>(createDraft);
  const [skuMode, setSkuMode] = useState<SkuMode>("AUTO");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [optionDialog, setOptionDialog] = useState<AddOptionType | null>(null);
  const [optionName, setOptionName] = useState("");
  const [costAccessCode, setCostAccessCode] = useState("");
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: InventorySortKey;
    direction: TableSortDirection;
  }>({ key: "product", direction: "ASC" });
  const branches = useMemo(
    () => Object.keys(branchInventory),
    [branchInventory],
  );
  const [selectedBranches, setSelectedBranches] = useState<string[]>(() =>
    Object.keys(branchInventory),
  );
  const draftVatBreakdown = calculateIncludedVat(
    draft.maxPrice,
    draft.includesVat,
  );
  const allBranchesSelected =
    branches.length > 0 && selectedBranches.length === branches.length;

  useEffect(() => {
    setSelectedBranches((current) => {
      const valid = current.filter((branch) => branches.includes(branch));
      const added = branches.filter((branch) => !current.includes(branch));
      return [...valid, ...added];
    });
    setDraft((current) => ({
      ...current,
      branches: current.branches.filter((branch) => branches.includes(branch)),
    }));
  }, [branches]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-MX");
    const visibleProducts = products.filter((product) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" ? product.active : !product.active);
      const matchesSearch =
        !query ||
        [
          product.name,
          product.sku,
          getSellerSku(product),
          product.family,
          product.category,
          product.group,
        ].some((value) => value.toLocaleLowerCase("es-MX").includes(query));
      const matchesBranch = product.branches.some((branch) =>
        selectedBranches.includes(branch),
      );
      return matchesStatus && matchesSearch && matchesBranch;
    });

    const selectedStockTotal = (product: Product) =>
      selectedBranches
        .filter((branch) => product.branches.includes(branch))
        .reduce(
          (sum, branch) => sum + (branchInventory[branch]?.[product.id] ?? 0),
          0,
        );
    const sortValue = (product: Product): string | number => {
      switch (sortConfig.key) {
        case "product":
          return `${product.name} ${product.sku}`;
        case "taxonomy":
          return `${product.family} ${product.category} ${product.group}`;
        case "prices":
          return product.maxPrice;
        case "stock":
          return product.kind === "SERVICE"
            ? Number.MAX_SAFE_INTEGER
            : selectedStockTotal(product);
        case "branches":
          return product.branches
            .filter((branch) => selectedBranches.includes(branch))
            .join(" ");
        case "status":
          return product.active ? 1 : 0;
      }
    };

    return [...visibleProducts].sort((left, right) => {
      const comparison = compareTableValues(sortValue(left), sortValue(right));
      return sortConfig.direction === "ASC" ? comparison : -comparison;
    });
  }, [
    branchInventory,
    products,
    search,
    selectedBranches,
    sortConfig,
    statusFilter,
  ]);

  const toggleSort = (key: InventorySortKey) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "ASC" ? "DESC" : "ASC",
    }));
  };

  const inventoryExportRows = useMemo(
    () =>
      filteredProducts.flatMap((product) =>
        selectedBranches
          .filter((branch) => product.branches.includes(branch))
          .map((branch) => ({
            SKU: product.sku,
            Producto: product.name,
            Tipo: product.kind === "PRODUCT" ? "Producto" : "Servicio",
            Familia: product.family,
            Categoría: product.category,
            Grupo: product.group,
            Sucursal: branch,
            Existencia:
              product.kind === "PRODUCT"
                ? (branchInventory[branch]?.[product.id] ?? 0)
                : "No aplica",
            "Stock mínimo": product.stockMin ?? "No aplica",
            "Stock máximo": product.stockMax ?? "No aplica",
            "Precio de lista MXN": product.maxPrice,
            "Precio mínimo MXN": product.minPrice,
            "Precio sin IVA MXN": calculateIncludedVat(
              product.maxPrice,
              product.includesVat,
            ).net,
            "IVA incluido MXN": calculateIncludedVat(
              product.maxPrice,
              product.includesVat,
            ).vat,
            "Tratamiento IVA": product.includesVat
              ? "Precio incluye IVA 16%"
              : "Sin IVA",
            Estado: product.active ? "Activo" : "Inactivo",
            ...(costAccessAuthorized && product.kind === "PRODUCT"
              ? {
                  "Costo unitario USD": product.costUsd,
                  "Costo unitario MXN": product.costMxn,
                  "Costo socio MXN": product.partnerCost ?? product.costMxn,
                }
              : {}),
          })),
      ),
    [
      branchInventory,
      costAccessAuthorized,
      filteredProducts,
      selectedBranches,
    ],
  );

  const toggleInventoryBranch = (branch: string) => {
    setSelectedBranches((current) => {
      if (current.length === branches.length) return [branch];
      if (current.includes(branch)) {
        if (current.length === 1) {
          toast.info("Elige al menos una sucursal para visualizar inventario.");
          return current;
        }
        return current.filter((item) => item !== branch);
      }
      return [...current, branch];
    });
  };

  const exportFilenameSuffix = () =>
    (allBranchesSelected ? "todas-las-sucursales" : selectedBranches.join("-"))
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es-MX")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const exportInventoryExcel = async () => {
    if (inventoryExportRows.length === 0) {
      toast.error("No hay productos para las sucursales y filtros elegidos.");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(inventoryExportRows);
      worksheet["!cols"] = [
        { wch: 20 },
        { wch: 30 },
        { wch: 12 },
        { wch: 20 },
        { wch: 20 },
        { wch: 18 },
        { wch: 16 },
        { wch: 12 },
        { wch: 13 },
        { wch: 13 },
        { wch: 19 },
        { wch: 12 },
        ...(costAccessAuthorized ? [{ wch: 18 }, { wch: 18 }] : []),
      ];
      if (worksheet["!ref"])
        worksheet["!autofilter"] = { ref: worksheet["!ref"] };
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
      XLSX.writeFile(
        workbook,
        `catalogo-inventario-${exportFilenameSuffix()}.xlsx`,
        { compression: true },
      );
      toast.success(
        `Excel generado para ${selectedBranches.length} sucursal${selectedBranches.length === 1 ? "" : "es"}.`,
      );
    } catch {
      toast.error("No fue posible generar el archivo de Excel.");
    }
  };

  const exportInventoryPdf = async () => {
    if (inventoryExportRows.length === 0) {
      toast.error("No hay productos para las sucursales y filtros elegidos.");
      return;
    }
    try {
      const [{ jsPDF }, { autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const headers = Object.keys(inventoryExportRows[0] ?? {});
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setTextColor(32, 27, 23);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("KEYSAR COSMETICS", 36, 34);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        `Inventario de catálogo - ${selectedBranches.join(", ")}`,
        36,
        50,
      );
      doc.text(
        `Generado ${new Date().toLocaleString("es-MX")} - ${inventoryExportRows.length} registros`,
        36,
        63,
      );
      autoTable(doc, {
        startY: 76,
        head: [headers],
        body: inventoryExportRows.map((row) =>
          headers.map((header) => String(row[header as keyof typeof row] ?? "")),
        ),
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: costAccessAuthorized ? 5.2 : 5.8,
          cellPadding: 3,
          textColor: [42, 37, 33],
          lineColor: [210, 198, 188],
          lineWidth: 0.35,
        },
        headStyles: {
          fillColor: [83, 67, 55],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [248, 244, 240] },
        didDrawPage: () => {
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          doc.setFontSize(7);
          doc.setTextColor(110, 102, 96);
          doc.text(
            `Sucursales seleccionadas: ${selectedBranches.join(", ")}`,
            36,
            pageHeight - 18,
          );
          doc.text(
            `Página ${doc.getNumberOfPages()}`,
            pageWidth - 68,
            pageHeight - 18,
          );
        },
      });
      doc.save(`catalogo-inventario-${exportFilenameSuffix()}.pdf`);
      toast.success(
        `PDF generado para ${selectedBranches.length} sucursal${selectedBranches.length === 1 ? "" : "es"}.`,
      );
    } catch {
      toast.error("No fue posible generar el archivo PDF.");
    }
  };

  const generatedSku = useMemo(() => {
    const familyCode = (draft.family || "GEN")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .split(/[^A-Z0-9]+/)
      .filter(Boolean)
      .map((word) => word.slice(0, 3))
      .join("")
      .slice(0, 8);
    const prefix = draft.kind === "SERVICE" ? "SRV" : "KSR";
    const base = `${prefix}-${familyCode || "GEN"}`;
    const usedSkus = new Set(
      products
        .filter((product) => product.id !== editingId)
        .map((product) => product.sku.toUpperCase()),
    );
    let sequence = 1;
    let candidate = "";
    do {
      candidate = `${base}-${String(sequence).padStart(3, "0")}`;
      sequence += 1;
    } while (usedSkus.has(candidate));
    return candidate;
  }, [draft.family, draft.kind, editingId, products]);

  const openNew = () => {
    setEditingId(null);
    setSkuMode("AUTO");
    setDraft({
      ...createDraft(),
      family: families[0] ?? "",
      category: categories[0] ?? "",
      group: groups[0] ?? "",
      branches: branches[0] ? [branches[0]] : [],
    });
    setAddMenuOpen(false);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setSkuMode("INTERNAL");
    setDraft({
      ...product,
      description: product.description ?? "",
      benefits: product.benefits ?? [],
      showInDigitalCatalog: product.showInDigitalCatalog !== false,
      partnerCost: product.partnerCost ?? product.costMxn,
      testerOrderEnabled: Boolean(product.testerOrderEnabled),
      branches: [...product.branches],
    });
    setDialogOpen(true);
  };

  const openOptionDialog = (type: AddOptionType) => {
    setOptionDialog(type);
    setOptionName("");
    setAddMenuOpen(false);
  };

  const saveOption = () => {
    const name = optionName.trim();
    if (!name || !optionDialog) return;
    if (optionDialog === "family") onAddFamily(name);
    if (optionDialog === "category") onAddCategory(name);
    if (optionDialog === "group") onAddGroup(name);
    toast.success(`${name} agregado al catálogo.`);
    setOptionDialog(null);
    setOptionName("");
  };

  const updateNumber = (
    field:
      | "minPrice"
      | "maxPrice"
      | "costUsd"
      | "costMxn"
      | "partnerCost"
      | "stock"
      | "stockMin"
      | "stockMax",
    value: string,
  ) => {
    setDraft((current) => ({
      ...current,
      [field]:
        current.kind === "SERVICE" && field.startsWith("stock")
          ? null
          : Math.max(0, Number(value) || 0),
    }));
  };

  const changeKind = (kind: ProductKind) => {
    setDraft((current) => ({
      ...current,
      kind,
      stock: kind === "SERVICE" ? null : (current.stock ?? 0),
      stockMin: kind === "SERVICE" ? null : (current.stockMin ?? 0),
      stockMax: kind === "SERVICE" ? null : (current.stockMax ?? 0),
    }));
  };

  const toggleBranch = (branch: string) => {
    setDraft((current) => ({
      ...current,
      branches: current.branches.includes(branch)
        ? current.branches.filter((item) => item !== branch)
        : [...current.branches, branch],
    }));
  };

  const loadImage = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setDraft((current) => ({ ...current, image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    const finalSku = skuMode === "AUTO" ? generatedSku : draft.sku.trim();
    if (
      !draft.name.trim() ||
      !finalSku ||
      !draft.family.trim() ||
      !draft.category.trim() ||
      !draft.group.trim()
    ) {
      toast.error("Completa nombre, SKU, familia, categoría y grupo.");
      return;
    }
    if (draft.minPrice <= 0 || draft.maxPrice < draft.minPrice) {
      toast.error("El precio máximo debe ser igual o mayor al mínimo.");
      return;
    }
    if (
      draft.kind === "PRODUCT" &&
      ((!editingId && !costAccessAuthorized) ||
        draft.costUsd <= 0 ||
        draft.costMxn <= 0 ||
        (draft.partnerCost ?? 0) < draft.costMxn)
    ) {
      toast.error(
        "Captura costos USD/MXN y un costo socio igual o mayor al costo MXN.",
      );
      return;
    }
    if (draft.branches.length === 0) {
      toast.error("Selecciona al menos una sucursal.");
      return;
    }
    if (
      draft.showInDigitalCatalog !== false &&
      (!draft.description?.trim() || (draft.benefits?.length ?? 0) === 0)
    ) {
      toast.error(
        "Agrega la descripción y al menos un beneficio para mostrarlo en el catálogo digital.",
      );
      return;
    }
    if (draft.kind === "PRODUCT") {
      const currentStock = draft.stock ?? 0;
      const minimumStock = draft.stockMin ?? 0;
      const maximumStock = draft.stockMax ?? 0;
      if (
        currentStock < 0 ||
        minimumStock < 0 ||
        maximumStock < 0 ||
        maximumStock < minimumStock ||
        currentStock > maximumStock
      ) {
        toast.error(
          "Revisa los límites de inventario. La existencia puede registrarse en 0.",
        );
        return;
      }
    }
    onSave({
      ...draft,
      name: draft.name.trim(),
      sku: finalSku.toUpperCase(),
      family: draft.family.trim(),
      category: draft.category.trim(),
      group: draft.group.trim(),
      description: draft.description?.trim() ?? "",
      benefits: (draft.benefits ?? [])
        .map((benefit) => benefit.trim())
        .filter(Boolean),
      showInDigitalCatalog: draft.showInDigitalCatalog !== false,
      active: editingId ? draft.active : true,
    });
    setDialogOpen(false);
    toast.success(editingId ? "Producto actualizado." : "Producto agregado.");
  };

  return (
    <div className="catalog-view">
      <div className="catalog-admin-toolbar">
        <div className="catalog-search">
          <Search size={17} />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar producto, familia, categoría o grupo"
            aria-label="Buscar en catálogo"
          />
        </div>
        <div
          className="segmented-control catalog-status-filter"
          aria-label="Filtrar productos por estado"
        >
          {(
            [
              ["ALL", "Todos", products.length],
              [
                "ACTIVE",
                "Activos",
                products.filter((product) => product.active).length,
              ],
              [
                "INACTIVE",
                "Inactivos",
                products.filter((product) => !product.active).length,
              ],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              className={statusFilter === value ? "is-active" : ""}
              onClick={() => setStatusFilter(value)}
              aria-pressed={statusFilter === value}
            >
              {label} <strong>{count}</strong>
            </button>
          ))}
        </div>
        <div className="catalog-add-menu-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOrderDialogOpen(true)}
          >
            <PackagePlus size={17} /> Generar pedido
          </Button>
          <Button
            type="button"
            onClick={() => setAddMenuOpen((current) => !current)}
            aria-expanded={addMenuOpen}
          >
            <Plus size={17} /> Agregar <ChevronDown size={15} />
          </Button>
          {addMenuOpen && (
            <div className="catalog-add-menu">
              <button type="button" onClick={openNew}>
                <Boxes size={16} /> Producto o servicio
              </button>
              <button type="button" onClick={() => openOptionDialog("family")}>
                <FolderPlus size={16} /> Familia
              </button>
              <button
                type="button"
                onClick={() => openOptionDialog("category")}
              >
                <Tags size={16} /> Categoría
              </button>
              <button type="button" onClick={() => openOptionDialog("group")}>
                <Layers3 size={16} /> Grupo
              </button>
            </div>
          )}
        </div>
      </div>

      <InventoryOrderDialog
        open={orderDialogOpen}
        onOpenChange={setOrderDialogOpen}
        products={products}
        branchInventory={branchInventory}
        defaultBranches={selectedBranches}
        isMasterCode={isMasterCode}
        onCreateOrders={onCreateInventoryOrders}
      />

      <section className="catalog-inventory-toolbar">
        <div className="catalog-inventory-filter-copy">
          <Store size={19} />
          <span>
            <small>INVENTARIO POR SUCURSAL</small>
            <strong>Elige una, varias o todas</strong>
          </span>
        </div>
        <div
          className="catalog-branch-filter"
          aria-label="Sucursales para visualizar inventario"
        >
          <button
            type="button"
            className={allBranchesSelected ? "is-active" : ""}
            onClick={() => setSelectedBranches(branches)}
            aria-pressed={allBranchesSelected}
          >
            Todas
          </button>
          {branches.map((branch) => (
            <button
              key={branch}
              type="button"
              className={
                selectedBranches.includes(branch) ? "is-active" : ""
              }
              onClick={() => toggleInventoryBranch(branch)}
              aria-pressed={selectedBranches.includes(branch)}
            >
              {branch}
            </button>
          ))}
        </div>
        <div className="catalog-inventory-export-summary">
          <span>
            <strong>{filteredProducts.length}</strong> productos ·{" "}
            <strong>{selectedBranches.length}</strong> sucursales
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={exportInventoryExcel}
            disabled={inventoryExportRows.length === 0}
          >
            <FileSpreadsheet size={16} /> Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={exportInventoryPdf}
            disabled={inventoryExportRows.length === 0}
          >
            <FileText size={16} /> PDF
          </Button>
        </div>
      </section>

      <div className="catalog-list-table">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead
                label="PRODUCTO"
                active={sortConfig.key === "product"}
                direction={sortConfig.direction}
                onSort={() => toggleSort("product")}
              />
              <SortableTableHead
                label="FAMILIA / CATEGORÍA / GRUPO"
                active={sortConfig.key === "taxonomy"}
                direction={sortConfig.direction}
                onSort={() => toggleSort("taxonomy")}
              />
              <SortableTableHead
                label="PRECIOS"
                active={sortConfig.key === "prices"}
                direction={sortConfig.direction}
                onSort={() => toggleSort("prices")}
              />
              <SortableTableHead
                label="INVENTARIO SELECCIONADO"
                active={sortConfig.key === "stock"}
                direction={sortConfig.direction}
                onSort={() => toggleSort("stock")}
              />
              <SortableTableHead
                label="VISIBLE EN"
                active={sortConfig.key === "branches"}
                direction={sortConfig.direction}
                onSort={() => toggleSort("branches")}
              />
              <SortableTableHead
                label="ESTATUS"
                active={sortConfig.key === "status"}
                direction={sortConfig.direction}
                onSort={() => toggleSort("status")}
              />
              <TableHead>ACCIONES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => {
              const visibleSelectedBranches = selectedBranches.filter(
                (branch) => product.branches.includes(branch),
              );
              const selectedStock = visibleSelectedBranches.map((branch) => ({
                branch,
                stock: branchInventory[branch]?.[product.id] ?? 0,
                tone: getStockTrafficTone(
                  branchInventory[branch]?.[product.id] ?? 0,
                  product.stockMin,
                  product.stockMax,
                ),
              }));
              const selectedStockTotal = selectedStock.reduce(
                (sum, item) => sum + item.stock,
                0,
              );
              const selectedStockTone = getStockTrafficTone(
                selectedStockTotal,
                (product.stockMin ?? 0) * Math.max(1, selectedStock.length),
                product.stockMax === null
                  ? null
                  : product.stockMax * Math.max(1, selectedStock.length),
              );
              return (
              <TableRow
                key={product.id}
                className={product.active ? "" : "catalog-row-inactive"}
              >
                <TableCell>
                  <div className="catalog-list-product">
                    <img src={product.image} alt={product.name} />
                    <span>
                      <strong>{product.name}</strong>
                      <small>{product.sku}</small>
                      {product.kind === "PRODUCT" && (
                        <small className={`catalog-tester-flag ${product.testerOrderEnabled ? "is-enabled" : ""}`}>
                          {product.testerOrderEnabled ? "TESTER AUTORIZADO" : "SIN TESTER"}
                        </small>
                      )}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="catalog-list-taxonomy">
                    <strong>{product.family}</strong>
                    <span>{product.category}</span>
                    <small>{product.group}</small>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="catalog-list-prices">
                    <span>Lista {formatCurrency(product.maxPrice)}</span>
                    {product.includesVat && (
                      <small className="catalog-vat-summary">
                        Sin IVA {formatCurrency(calculateIncludedVat(product.maxPrice, true).net)} · IVA {formatCurrency(calculateIncludedVat(product.maxPrice, true).vat)}
                      </small>
                    )}
                    <strong className="catalog-minimum-price">
                      Mínimo {formatCurrency(product.minPrice)}
                    </strong>
                    {costAccessAuthorized && product.kind === "PRODUCT" && (
                      <small className="catalog-protected-cost">
                        Costo {formatCurrency(product.costMxn)} MXN · $
                        {product.costUsd.toFixed(2)} USD · Socio {formatCurrency(product.partnerCost ?? product.costMxn)}
                      </small>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {product.stock === null ? (
                    <Badge variant="outline">SERVICIO</Badge>
                  ) : (
                    <div className="catalog-list-stock catalog-branch-stock">
                      <strong
                        className={selectedStockTone}
                      >
                        {selectedStockTotal}{" "}
                        <em>total</em>
                      </strong>
                      <span>
                        {selectedStock.map((item) => (
                          <small
                            key={item.branch}
                            className={item.tone}
                          >
                            {item.branch} <b>{item.stock}</b>
                          </small>
                        ))}
                      </span>
                      <small>
                        mín {product.stockMin} · máx {product.stockMax}
                      </small>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="catalog-branches">
                    <Store size={14} /> {visibleSelectedBranches.join(" · ")}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={product.active ? "default" : "outline"}>
                    {product.active ? "ACTIVO" : "INACTIVO"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="catalog-admin-actions">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(product)}
                    >
                      <Pencil size={14} /> Editar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const nextActive = !product.active;
                        const message = nextActive
                          ? `¿Activar ${product.name}? Volverá a mostrarse en las pantallas operativas.`
                          : `¿Desactivar ${product.name}? Se retirará de las pantallas operativas y del carrito, pero los tickets anteriores se conservarán.`;
                        if (window.confirm(message)) {
                          onStatusChange(product.id, nextActive);
                        }
                      }}
                    >
                      {product.active ? (
                        <PowerOff size={14} />
                      ) : (
                        <Power size={14} />
                      )}
                      {product.active ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              );
            })}
            {filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  No hay productos para las sucursales y filtros seleccionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="catalog-dialog sm:max-w-[920px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar producto" : "Alta de producto o servicio"}
            </DialogTitle>
            <DialogDescription>
              Los cambios afectan inmediatamente Sale e Inventory, pero no los
              tickets históricos.
            </DialogDescription>
          </DialogHeader>

          <div className="catalog-form-grid">
            <div className="catalog-photo-editor">
              <img src={draft.image} alt="Vista previa del producto" />
              <Label htmlFor="catalog-photo">
                <ImagePlus size={15} /> Agregar foto
              </Label>
              <Input
                id="catalog-photo"
                type="file"
                accept="image/*"
                onChange={(event) => loadImage(event.target.files?.[0])}
              />
              <Input
                value={draft.image.startsWith("data:") ? "" : draft.image}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    image: event.target.value,
                  }))
                }
                placeholder="O pega una URL de imagen"
                aria-label="URL de imagen del producto"
              />
            </div>

            <div className="catalog-fields">
              <div className="field-stack">
                <Label htmlFor="catalog-name">Nombre</Label>
                <Input
                  id="catalog-name"
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="field-stack catalog-editor-wide">
                <Label htmlFor="catalog-description">
                  Descripción para catálogo
                </Label>
                <Textarea
                  id="catalog-description"
                  value={draft.description ?? ""}
                  maxLength={520}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe la experiencia, textura, uso o resultado que verá el cliente."
                />
                <small>
                  Este texto es comercial y sólo aparece en el catálogo digital.
                </small>
              </div>
              <div className="field-stack catalog-editor-wide">
                <Label htmlFor="catalog-benefits">Beneficios</Label>
                <Textarea
                  id="catalog-benefits"
                  value={(draft.benefits ?? []).join("\n")}
                  maxLength={420}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      benefits: event.target.value.split("\n"),
                    }))
                  }
                  placeholder={"Un beneficio por línea\nHidratación prolongada\nLuminosidad visible"}
                />
                <small>Escribe un beneficio por línea.</small>
              </div>
              <button
                type="button"
                className={`catalog-vat-toggle catalog-digital-toggle catalog-editor-wide ${draft.showInDigitalCatalog !== false ? "is-active" : ""}`}
                role="switch"
                aria-checked={draft.showInDigitalCatalog !== false}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    showInDigitalCatalog: current.showInDigitalCatalog === false,
                  }))
                }
              >
                <span>
                  <strong>Mostrar en catálogo</strong>
                  <small>
                    {draft.showInDigitalCatalog !== false
                      ? "El cliente podrá visualizarlo en el libro digital."
                      : "Quedará oculto del libro sin afectar Sale, Inventory ni tickets anteriores."}
                  </small>
                </span>
                <span
                  className={`mock-switch ${draft.showInDigitalCatalog !== false ? "is-on" : ""}`}
                >
                  <i />
                </span>
              </button>
              <div className="field-stack catalog-sku-field">
                <Label htmlFor="catalog-sku">SKU base</Label>
                <div className="segmented-control catalog-sku-mode">
                  <button
                    type="button"
                    className={skuMode === "AUTO" ? "is-active" : ""}
                    onClick={() => setSkuMode("AUTO")}
                  >
                    <WandSparkles size={14} /> Generar por familia
                  </button>
                  <button
                    type="button"
                    className={skuMode === "INTERNAL" ? "is-active" : ""}
                    onClick={() => setSkuMode("INTERNAL")}
                  >
                    Capturar SKU interno
                  </button>
                </div>
                <Input
                  id="catalog-sku"
                  value={skuMode === "AUTO" ? generatedSku : draft.sku}
                  readOnly={skuMode === "AUTO"}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      sku: event.target.value,
                    }))
                  }
                />
                <small>
                  {skuMode === "AUTO"
                    ? "Se genera con tipo, familia y consecutivo disponible."
                    : "Escribe el identificador interno definido por la empresa."}
                </small>
              </div>
              <div className="field-stack">
                <Label htmlFor="catalog-kind">Tipo</Label>
                <Select value={draft.kind} onValueChange={changeKind}>
                  <SelectTrigger id="catalog-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRODUCT">Producto</SelectItem>
                    <SelectItem value="SERVICE">Servicio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="field-stack">
                <Label htmlFor="catalog-family">Familia</Label>
                <Select
                  value={draft.family}
                  onValueChange={(family) =>
                    setDraft((current) => ({
                      ...current,
                      family,
                    }))
                  }
                >
                  <SelectTrigger id="catalog-family">
                    <SelectValue placeholder="Selecciona familia" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set([draft.family, ...families]))
                      .filter(Boolean)
                      .map((family) => (
                      <SelectItem key={family} value={family}>
                        {family}
                      </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="field-stack">
                <Label htmlFor="catalog-category">Categoría</Label>
                <Select
                  value={draft.category}
                  onValueChange={(category) =>
                    setDraft((current) => ({
                      ...current,
                      category,
                    }))
                  }
                >
                  <SelectTrigger id="catalog-category">
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set([draft.category, ...categories]))
                      .filter(Boolean)
                      .map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="field-stack">
                <Label htmlFor="catalog-group">Grupo</Label>
                <Select
                  value={draft.group}
                  onValueChange={(group) =>
                    setDraft((current) => ({
                      ...current,
                      group,
                    }))
                  }
                >
                  <SelectTrigger id="catalog-group">
                    <SelectValue placeholder="Selecciona grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="field-stack">
                <Label htmlFor="catalog-min-price">Precio mínimo</Label>
                <Input
                  id="catalog-min-price"
                  type="number"
                  min="0"
                  value={draft.minPrice}
                  onChange={(event) =>
                    updateNumber("minPrice", event.target.value)
                  }
                />
              </div>
              <div className="field-stack">
                <Label htmlFor="catalog-max-price">Precio máximo / lista</Label>
                <Input
                  id="catalog-max-price"
                  type="number"
                  min="0"
                  value={draft.maxPrice}
                  onChange={(event) =>
                    updateNumber("maxPrice", event.target.value)
                  }
                />
              </div>
              <button
                type="button"
                className={`catalog-vat-toggle ${draft.includesVat ? "is-active" : ""}`}
                role="switch"
                aria-checked={draft.includesVat}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    includesVat: !current.includesVat,
                  }))
                }
              >
                <span>
                  <strong>El precio de lista incluye IVA 16%</strong>
                  <small>
                    {draft.includesVat
                      ? `${formatCurrency(draftVatBreakdown.gross)} final = ${formatCurrency(draftVatBreakdown.net)} sin IVA + ${formatCurrency(draftVatBreakdown.vat)} de IVA`
                      : "Activa el switch para desglosar el impuesto incluido en el precio capturado."}
                  </small>
                </span>
                <span className={`mock-switch ${draft.includesVat ? "is-on" : ""}`}>
                  <i />
                </span>
              </button>
              {draft.kind === "PRODUCT" && (
                <>
                  <button
                    type="button"
                    className={`catalog-vat-toggle catalog-tester-toggle ${draft.testerOrderEnabled ? "is-active" : ""}`}
                    role="switch"
                    aria-checked={Boolean(draft.testerOrderEnabled)}
                    onClick={() => setDraft((current) => ({
                      ...current,
                      testerOrderEnabled: !current.testerOrderEnabled,
                    }))}
                  >
                    <span>
                      <strong>Autorizar pedido como tester</strong>
                      <small>
                        {draft.testerOrderEnabled
                          ? "Las sucursales podrán solicitar este producto en el módulo Pedido de testers."
                          : "El producto permanecerá oculto en las solicitudes de testers de las sucursales."}
                      </small>
                    </span>
                    <span className={`mock-switch ${draft.testerOrderEnabled ? "is-on" : ""}`}><i /></span>
                  </button>
                  <div className="catalog-cost-access-panel">
                    {costAccessAuthorized ? (
                      <>
                        <div className="catalog-cost-access-heading">
                          <span>
                            <ShieldCheck size={17} /> COSTOS PROTEGIDOS
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={onLockCostAccess}
                          >
                            <LockKeyhole size={14} /> Bloquear
                          </Button>
                        </div>
                        <div className="catalog-cost-fields">
                          <div className="field-stack">
                            <Label htmlFor="catalog-cost-usd">
                              Precio de costo USD
                            </Label>
                            <Input
                              id="catalog-cost-usd"
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={draft.costUsd}
                              onChange={(event) =>
                                updateNumber("costUsd", event.target.value)
                              }
                            />
                          </div>
                          <div className="field-stack">
                            <Label htmlFor="catalog-cost-mxn">
                              Precio de costo MXN
                            </Label>
                            <Input
                              id="catalog-cost-mxn"
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={draft.costMxn}
                              onChange={(event) =>
                                updateNumber("costMxn", event.target.value)
                              }
                            />
                          </div>
                          <div className="field-stack">
                            <Label htmlFor="catalog-partner-cost">
                              Costo socio MXN
                            </Label>
                            <Input
                              id="catalog-partner-cost"
                              type="number"
                              min={draft.costMxn}
                              step="0.01"
                              value={draft.partnerCost ?? 0}
                              onChange={(event) =>
                                updateNumber("partnerCost", event.target.value)
                              }
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="catalog-cost-lock">
                        <LockKeyhole size={19} />
                        <span>
                          <strong>Costos protegidos</strong>
                          <small>
                            Código master o de usuario autorizado requerido.
                          </small>
                        </span>
                        <Input
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          value={costAccessCode}
                          onChange={(event) =>
                            setCostAccessCode(
                              event.target.value.replace(/\D/g, "").slice(0, 4),
                            )
                          }
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" &&
                              onAuthorizeCostAccess(costAccessCode)
                            )
                              setCostAccessCode("");
                          }}
                          placeholder="Código de acceso"
                          aria-label="Código para ver costos"
                        />
                        <Button
                          type="button"
                          disabled={costAccessCode.length !== 4}
                          onClick={() => {
                            if (onAuthorizeCostAccess(costAccessCode))
                              setCostAccessCode("");
                          }}
                        >
                          <ShieldCheck size={15} /> Desbloquear
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="field-stack">
                    <Label htmlFor="catalog-stock">Existencia actual</Label>
                    <Input
                      id="catalog-stock"
                      type="number"
                      min="0"
                      step="1"
                      value={draft.stock ?? 0}
                      onChange={(event) =>
                        updateNumber("stock", event.target.value)
                      }
                    />
                    <small className="catalog-zero-stock-note">
                      Se permite guardar el producto con existencia en 0.
                    </small>
                  </div>
                  <div className="field-stack">
                    <Label htmlFor="catalog-stock-min">Stock mínimo</Label>
                    <Input
                      id="catalog-stock-min"
                      type="number"
                      min="0"
                      value={draft.stockMin ?? 0}
                      onChange={(event) =>
                        updateNumber("stockMin", event.target.value)
                      }
                    />
                  </div>
                  <div className="field-stack">
                    <Label htmlFor="catalog-stock-max">Stock máximo</Label>
                    <Input
                      id="catalog-stock-max"
                      type="number"
                      min="0"
                      value={draft.stockMax ?? 0}
                      onChange={(event) =>
                        updateNumber("stockMax", event.target.value)
                      }
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="branch-selector">
            <span>
              <Boxes size={15} /> Visible en Sale para estas sucursales
            </span>
            <div>
              {branches.map((branch) => (
                <button
                  key={branch}
                  type="button"
                  className={draft.branches.includes(branch) ? "is-active" : ""}
                  onClick={() => toggleBranch(branch)}
                  aria-pressed={draft.branches.includes(branch)}
                >
                  {branch}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={save}>
              Guardar en catálogo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(optionDialog)}
        onOpenChange={(open) => !open && setOptionDialog(null)}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>
              Agregar{" "}
              {optionDialog === "family"
                ? "familia"
                : optionDialog === "category"
                  ? "categoría"
                  : "grupo"}
            </DialogTitle>
            <DialogDescription>
              La nueva opción quedará disponible en la lista desplegable de
              productos.
            </DialogDescription>
          </DialogHeader>
          <div className="field-stack">
            <Label htmlFor="catalog-option-name">Nombre</Label>
            <Input
              id="catalog-option-name"
              value={optionName}
              onChange={(event) => setOptionName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveOption();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOptionDialog(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={saveOption}
              disabled={!optionName.trim()}
            >
              Agregar al catálogo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
