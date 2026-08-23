import { useMemo, useState } from "react";
import {
  Boxes,
  ChevronDown,
  FolderPlus,
  ImagePlus,
  Layers3,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
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
  toast,
} from "@cosmetics/ui";
import { formatCurrency, getSellerSku } from "../mock-data";
import type { Product, ProductKind } from "../types";

const availableBranches = ["Polanco", "Satélite", "Roma Norte"];

interface CatalogViewProps {
  products: Product[];
  families: string[];
  categories: string[];
  groups: string[];
  onSave: (product: Product) => void;
  onStatusChange: (productId: string, active: boolean) => void;
  onAddFamily: (name: string) => void;
  onAddCategory: (name: string) => void;
  onAddGroup: (name: string) => void;
}

type AddOptionType = "family" | "category" | "group";
type SkuMode = "AUTO" | "INTERNAL";
type CatalogStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const createDraft = (): Product => ({
  id: `product-${Date.now()}`,
  name: "",
  sku: "",
  family: "",
  category: "",
  group: "",
  kind: "PRODUCT",
  image: "/products/renewal-serum.png",
  minPrice: 0,
  maxPrice: 0,
  stock: 0,
  stockMin: 0,
  stockMax: 0,
  branches: ["Polanco"],
  active: true,
});

export function CatalogView({
  products,
  families,
  categories,
  groups,
  onSave,
  onStatusChange,
  onAddFamily,
  onAddCategory,
  onAddGroup,
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

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-MX");
    return products.filter((product) => {
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
      return matchesStatus && matchesSearch;
    });
  }, [products, search, statusFilter]);

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
    });
    setAddMenuOpen(false);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setSkuMode("INTERNAL");
    setDraft({ ...product, branches: [...product.branches] });
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
    field: "minPrice" | "maxPrice" | "stock" | "stockMin" | "stockMax",
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
    if (draft.branches.length === 0) {
      toast.error("Selecciona al menos una sucursal.");
      return;
    }
    if (
      draft.kind === "PRODUCT" &&
      ((draft.stockMax ?? 0) < (draft.stockMin ?? 0) ||
        (draft.stock ?? 0) > (draft.stockMax ?? 0))
    ) {
      toast.error("Revisa los límites y la existencia actual.");
      return;
    }
    onSave({
      ...draft,
      name: draft.name.trim(),
      sku: finalSku.toUpperCase(),
      family: draft.family.trim(),
      category: draft.category.trim(),
      group: draft.group.trim(),
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

      <div className="catalog-list-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PRODUCTO</TableHead>
              <TableHead>FAMILIA / CATEGORÍA / GRUPO</TableHead>
              <TableHead>PRECIOS</TableHead>
              <TableHead>STOCK</TableHead>
              <TableHead>SUCURSALES</TableHead>
              <TableHead>ESTATUS</TableHead>
              <TableHead>ACCIONES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow
                key={product.id}
                className={product.active ? "" : "catalog-row-inactive"}
              >
                <TableCell>
                  <div className="catalog-list-product">
                    <img src={product.image} alt={product.name} />
                    <span>
                      <strong>{product.name}</strong>
                      <small>{getSellerSku(product)}</small>
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
                    <small>Mínimo codificado en SKU</small>
                  </div>
                </TableCell>
                <TableCell>
                  {product.stock === null ? (
                    <Badge variant="outline">SERVICIO</Badge>
                  ) : (
                    <div className="catalog-list-stock">
                      <strong>{product.stock}</strong>
                      <small>
                        mín {product.stockMin} · máx {product.stockMax}
                      </small>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="catalog-branches">
                    <Store size={14} /> {product.branches.join(" · ")}
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
            ))}
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
                    {families.map((family) => (
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
                    {categories.map((category) => (
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
              {draft.kind === "PRODUCT" && (
                <>
                  <div className="field-stack">
                    <Label htmlFor="catalog-stock">Existencia actual</Label>
                    <Input
                      id="catalog-stock"
                      type="number"
                      min="0"
                      value={draft.stock ?? 0}
                      onChange={(event) =>
                        updateNumber("stock", event.target.value)
                      }
                    />
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
              {availableBranches.map((branch) => (
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
