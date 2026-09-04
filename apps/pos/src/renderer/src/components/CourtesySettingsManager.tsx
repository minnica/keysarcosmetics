import { useMemo, useState } from "react";
import {
  Gift,
  Minus,
  Pencil,
  Plus,
  Power,
  PowerOff,
} from "lucide-react";
import {
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
  toast,
} from "@cosmetics/ui";
import type {
  CourtesyPackageOption,
  CourtesyProductOption,
  CourtesySettings,
} from "../types";

interface CourtesySettingsManagerProps {
  settings: CourtesySettings;
  canManage: boolean;
  onChange: (settings: CourtesySettings) => void;
}

type ProductDraft = Pick<CourtesyProductOption, "name" | "category"> & {
  id?: string;
};

type PackageDraft = Pick<CourtesyPackageOption, "name" | "serviceIds"> & {
  id?: string;
};

const normalizedName = (value: string) =>
  value.trim().toLocaleLowerCase("es-MX");

export function CourtesySettingsManager({
  settings,
  canManage,
  onChange,
}: CourtesySettingsManagerProps) {
  const [productDraft, setProductDraft] = useState<ProductDraft | null>(null);
  const [packageDraft, setPackageDraft] = useState<PackageDraft | null>(null);

  const activeProducts = settings.products.filter((product) => product.active);
  const availablePackages = useMemo(() => {
    const activeProductIds = new Set(activeProducts.map((product) => product.id));
    return settings.packages.filter(
      (option) =>
        option.active &&
        settings.enabledPackages.includes(option.id) &&
        option.serviceIds.length > 0 &&
        option.serviceIds.length <= 2 &&
        option.serviceIds.every((serviceId) => activeProductIds.has(serviceId)),
    );
  }, [activeProducts, settings.enabledPackages, settings.packages]);

  const productName = (productId: string) =>
    settings.products.find((product) => product.id === productId)?.name ??
    "Producto inactivo";

  const setRequired = () => {
    if (!canManage) return;
    if (!settings.required && availablePackages.length === 0) {
      toast.error("Activa al menos un paquete válido antes de exigir cortesía.");
      return;
    }
    onChange({ ...settings, required: !settings.required });
  };

  const saveProduct = () => {
    if (!productDraft || !canManage) return;
    const name = productDraft.name.trim();
    if (!name) {
      toast.error("Escribe el nombre del producto de cortesía.");
      return;
    }
    if (
      settings.products.some(
        (product) =>
          product.id !== productDraft.id &&
          normalizedName(product.name) === normalizedName(name),
      )
    ) {
      toast.error("Ya existe un producto de cortesía con ese nombre.");
      return;
    }
    const products = productDraft.id
      ? settings.products.map((product) =>
          product.id === productDraft.id
            ? { ...product, name, category: productDraft.category }
            : product,
        )
      : [
          ...settings.products,
          {
            id: `courtesy-product-${crypto.randomUUID()}`,
            name,
            category: productDraft.category,
            active: true,
          },
        ];
    onChange({ ...settings, products });
    setProductDraft(null);
    toast.success(productDraft.id ? "Producto actualizado." : "Producto añadido.");
  };

  const toggleProduct = (productId: string) => {
    if (!canManage) return;
    const product = settings.products.find((candidate) => candidate.id === productId);
    if (!product) return;
    if (!product.active) {
      onChange({
        ...settings,
        products: settings.products.map((candidate) =>
          candidate.id === productId ? { ...candidate, active: true } : candidate,
        ),
      });
      toast.success("Producto de cortesía activado.");
      return;
    }

    const affectedPackageIds = new Set(
      settings.packages
        .filter((option) => option.serviceIds.includes(productId))
        .map((option) => option.id),
    );
    const packages = settings.packages.map((option) =>
      affectedPackageIds.has(option.id) ? { ...option, active: false } : option,
    );
    const enabledPackages = settings.enabledPackages.filter(
      (id) => !affectedPackageIds.has(id),
    );
    const defaultPackage = enabledPackages.includes(settings.defaultPackage)
      ? settings.defaultPackage
      : enabledPackages[0] ?? "";
    onChange({
      ...settings,
      required: enabledPackages.length > 0 ? settings.required : false,
      products: settings.products.map((candidate) =>
        candidate.id === productId ? { ...candidate, active: false } : candidate,
      ),
      packages,
      enabledPackages,
      defaultPackage,
    });
    toast.info(
      affectedPackageIds.size > 0
        ? `Producto inactivado junto con ${affectedPackageIds.size} paquete(s) relacionado(s).`
        : "Producto de cortesía inactivado.",
    );
  };

  const updatePackageProductQuantity = (productId: string, delta: number) => {
    setPackageDraft((current) => {
      if (!current) return current;
      const serviceIds = [...current.serviceIds];
      if (delta > 0) {
        if (serviceIds.length >= 2) {
          toast.error("Una cortesía puede incluir como máximo dos servicios.");
          return current;
        }
        serviceIds.push(productId);
      } else {
        const index = serviceIds.lastIndexOf(productId);
        if (index >= 0) serviceIds.splice(index, 1);
      }
      return { ...current, serviceIds };
    });
  };

  const savePackage = () => {
    if (!packageDraft || !canManage) return;
    const name = packageDraft.name.trim();
    if (!name) {
      toast.error("Escribe el nombre del paquete.");
      return;
    }
    if (packageDraft.serviceIds.length < 1 || packageDraft.serviceIds.length > 2) {
      toast.error("El paquete debe contener uno o dos servicios.");
      return;
    }
    if (
      packageDraft.serviceIds.some(
        (id) => !settings.products.some((product) => product.id === id && product.active),
      )
    ) {
      toast.error("Todos los productos del paquete deben estar activos.");
      return;
    }
    if (
      settings.packages.some(
        (option) =>
          option.id !== packageDraft.id &&
          normalizedName(option.name) === normalizedName(name),
      )
    ) {
      toast.error("Ya existe un paquete de cortesía con ese nombre.");
      return;
    }
    const id = packageDraft.id ?? `courtesy-package-${crypto.randomUUID()}`;
    const packageIsActive =
      settings.packages.find((option) => option.id === id)?.active ?? true;
    const packages = packageDraft.id
      ? settings.packages.map((option) =>
          option.id === id
            ? { ...option, name, serviceIds: packageDraft.serviceIds }
            : option,
        )
      : [
          ...settings.packages,
          { id, name, serviceIds: packageDraft.serviceIds, active: true },
        ];
    const enabledPackages = packageIsActive
      ? settings.enabledPackages.includes(id)
        ? settings.enabledPackages
        : [...settings.enabledPackages, id]
      : settings.enabledPackages.filter((packageId) => packageId !== id);
    onChange({
      ...settings,
      packages,
      enabledPackages,
      defaultPackage:
        settings.defaultPackage || (packageIsActive ? id : ""),
    });
    setPackageDraft(null);
    toast.success(packageDraft.id ? "Paquete actualizado." : "Paquete añadido.");
  };

  const togglePackage = (packageId: string) => {
    if (!canManage) return;
    const option = settings.packages.find((candidate) => candidate.id === packageId);
    if (!option) return;
    if (!option.active) {
      if (
        option.serviceIds.some(
          (id) => !settings.products.some((product) => product.id === id && product.active),
        )
      ) {
        toast.error("Activa primero todos los productos incluidos en este paquete.");
        return;
      }
      onChange({
        ...settings,
        packages: settings.packages.map((candidate) =>
          candidate.id === packageId ? { ...candidate, active: true } : candidate,
        ),
        enabledPackages: [...new Set([...settings.enabledPackages, packageId])],
        defaultPackage: settings.defaultPackage || packageId,
      });
      toast.success("Paquete de cortesía activado.");
      return;
    }
    const enabledPackages = settings.enabledPackages.filter((id) => id !== packageId);
    onChange({
      ...settings,
      required: enabledPackages.length > 0 ? settings.required : false,
      packages: settings.packages.map((candidate) =>
        candidate.id === packageId ? { ...candidate, active: false } : candidate,
      ),
      enabledPackages,
      defaultPackage:
        settings.defaultPackage === packageId
          ? enabledPackages[0] ?? ""
          : settings.defaultPackage,
    });
    toast.info("Paquete de cortesía inactivado.");
  };

  return (
    <>
      <Card className="settings-card courtesy-settings-card">
        <CardContent>
          <div className="courtesy-settings-heading">
            <div>
              <span className="section-kicker">VENTA · CLIENTE NUEVO</span>
              <h2>Paquetes y productos de cortesía</h2>
              <p>
                Administra los servicios y combinaciones disponibles durante Checkout.
              </p>
            </div>
            {!canManage && <small>Acceso de consulta</small>}
          </div>

          <button
            type="button"
            className={`courtesy-required-toggle ${settings.required ? "is-active" : ""}`}
            role="switch"
            aria-checked={settings.required}
            onClick={setRequired}
            disabled={!canManage}
          >
            <span>
              <strong>Solicitar cortesía al registrar cliente</strong>
              <small>
                {settings.required
                  ? "Checkout exige paquete, fecha, sucursal y horario."
                  : "La pregunta se omite; la venta continúa normalmente."}
              </small>
            </span>
            <span className={`mock-switch ${settings.required ? "is-on" : ""}`}>
              <i />
            </span>
          </button>

          <div className="courtesy-admin-grid">
            <section className="courtesy-admin-panel">
              <header>
                <span>
                  <Gift size={17} />
                  <strong>Productos de cortesía</strong>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canManage}
                  onClick={() =>
                    setProductDraft({ name: "", category: "FACIAL" })
                  }
                >
                  <Plus size={14} /> Añadir
                </Button>
              </header>
              <div className="courtesy-admin-list">
                {settings.products.map((product) => (
                  <article key={product.id} className={product.active ? "" : "is-inactive"}>
                    <span>
                      <strong>{product.name}</strong>
                      <small>
                        {product.category === "FACIAL" ? "Facial" : "Corporal"} ·{" "}
                        {product.active ? "Activo" : "Inactivo"}
                      </small>
                    </span>
                    <div>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={!canManage}
                        onClick={() =>
                          setProductDraft({
                            id: product.id,
                            name: product.name,
                            category: product.category,
                          })
                        }
                        aria-label={`Editar ${product.name}`}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={!canManage}
                        onClick={() => toggleProduct(product.id)}
                        aria-label={`${product.active ? "Inactivar" : "Activar"} ${product.name}`}
                      >
                        {product.active ? <PowerOff size={14} /> : <Power size={14} />}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="courtesy-admin-panel">
              <header>
                <span>
                  <Gift size={17} />
                  <strong>Paquetes</strong>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canManage || activeProducts.length === 0}
                  onClick={() =>
                    setPackageDraft({
                      name: "",
                      serviceIds: activeProducts[0] ? [activeProducts[0].id] : [],
                    })
                  }
                >
                  <Plus size={14} /> Añadir
                </Button>
              </header>
              <div className="courtesy-admin-list">
                {settings.packages.map((option) => (
                  <article key={option.id} className={option.active ? "" : "is-inactive"}>
                    <span>
                      <strong>{option.name}</strong>
                      <small>
                        {option.serviceIds.map(productName).join(" + ")} ·{" "}
                        {option.active ? "Activo" : "Inactivo"}
                      </small>
                    </span>
                    <div>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={!canManage}
                        onClick={() =>
                          setPackageDraft({
                            id: option.id,
                            name: option.name,
                            serviceIds: [...option.serviceIds],
                          })
                        }
                        aria-label={`Editar ${option.name}`}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={!canManage}
                        onClick={() => togglePackage(option.id)}
                        aria-label={`${option.active ? "Inactivar" : "Activar"} ${option.name}`}
                      >
                        {option.active ? <PowerOff size={14} /> : <Power size={14} />}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <div className="field-stack courtesy-default-package">
            <span>Paquete seleccionado por defecto</span>
            <Select
              value={settings.defaultPackage}
              disabled={!canManage || availablePackages.length === 0}
              onValueChange={(value) =>
                onChange({ ...settings, defaultPackage: value })
              }
            >
              <SelectTrigger aria-label="Paquete de cortesía por defecto">
                <SelectValue placeholder="Sin paquetes activos" />
              </SelectTrigger>
              <SelectContent>
                {availablePackages.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(productDraft)} onOpenChange={(open) => !open && setProductDraft(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{productDraft?.id ? "Editar producto" : "Añadir producto"}</DialogTitle>
            <DialogDescription>
              Este nombre será el servicio que aparecerá en la cita y el ticket.
            </DialogDescription>
          </DialogHeader>
          {productDraft && (
            <div className="courtesy-editor-fields">
              <div className="field-stack">
                <Label htmlFor="courtesy-product-name">Nombre</Label>
                <Input
                  id="courtesy-product-name"
                  value={productDraft.name}
                  onChange={(event) =>
                    setProductDraft((current) =>
                      current ? { ...current, name: event.target.value } : current,
                    )
                  }
                  placeholder="Ej. Facial calmante de cortesía"
                />
              </div>
              <div className="field-stack">
                <Label htmlFor="courtesy-product-category">Tipo</Label>
                <Select
                  value={productDraft.category}
                  onValueChange={(category) =>
                    setProductDraft((current) =>
                      current
                        ? {
                            ...current,
                            category: category as CourtesyProductOption["category"],
                          }
                        : current,
                    )
                  }
                >
                  <SelectTrigger id="courtesy-product-category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FACIAL">Facial</SelectItem>
                    <SelectItem value="BODY">Corporal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setProductDraft(null)}>Cancelar</Button>
            <Button type="button" onClick={saveProduct}>Guardar producto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(packageDraft)} onOpenChange={(open) => !open && setPackageDraft(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{packageDraft?.id ? "Editar paquete" : "Añadir paquete"}</DialogTitle>
            <DialogDescription>
              Combina uno o dos servicios. Puedes repetir un producto para crear un paquete doble.
            </DialogDescription>
          </DialogHeader>
          {packageDraft && (
            <div className="courtesy-editor-fields">
              <div className="field-stack">
                <Label htmlFor="courtesy-package-name">Nombre</Label>
                <Input
                  id="courtesy-package-name"
                  value={packageDraft.name}
                  onChange={(event) =>
                    setPackageDraft((current) =>
                      current ? { ...current, name: event.target.value } : current,
                    )
                  }
                  placeholder="Ej. Doble facial premium"
                />
              </div>
              <div className="courtesy-package-product-picker">
                {settings.products
                  .filter(
                    (product) =>
                      product.active || packageDraft.serviceIds.includes(product.id),
                  )
                  .map((product) => {
                    const quantity = packageDraft.serviceIds.filter(
                      (id) => id === product.id,
                    ).length;
                    return (
                      <article key={product.id} className={product.active ? "" : "is-inactive"}>
                        <span>
                          <strong>{product.name}</strong>
                          <small>{product.active ? "Disponible" : "Inactivo"}</small>
                        </span>
                        <div>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            disabled={quantity === 0}
                            onClick={() => updatePackageProductQuantity(product.id, -1)}
                          >
                            <Minus size={14} />
                          </Button>
                          <strong>{quantity}</strong>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            disabled={!product.active || packageDraft.serviceIds.length >= 2}
                            onClick={() => updatePackageProductQuantity(product.id, 1)}
                          >
                            <Plus size={14} />
                          </Button>
                        </div>
                      </article>
                    );
                  })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPackageDraft(null)}>Cancelar</Button>
            <Button type="button" onClick={savePackage}>Guardar paquete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
