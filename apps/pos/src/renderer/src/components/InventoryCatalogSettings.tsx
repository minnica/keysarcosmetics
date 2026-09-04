import { useState } from "react";
import {
  Boxes,
  FolderTree,
  Pencil,
  Power,
  PowerOff,
  Tags,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@cosmetics/ui";
import { getSellerSku } from "../mock-data";
import type { Product } from "../types";

type CatalogTab = "FAMILIES" | "CATEGORIES" | "PRODUCTS";
type EditTarget =
  | { type: "FAMILY"; id: string; label: string }
  | { type: "CATEGORY"; id: string; label: string }
  | { type: "PRODUCT"; id: string; label: string };

interface InventoryCatalogSettingsProps {
  families: string[];
  categories: string[];
  products: Product[];
  familyStatus: Record<string, boolean>;
  categoryStatus: Record<string, boolean>;
  onRenameFamily: (currentName: string, nextName: string) => void;
  onRenameCategory: (currentName: string, nextName: string) => void;
  onRenameProduct: (productId: string, nextName: string) => void;
  onToggleFamily: (name: string, active: boolean) => void;
  onToggleCategory: (name: string, active: boolean) => void;
  onToggleProduct: (productId: string, active: boolean) => void;
}

export function InventoryCatalogSettings({
  families,
  categories,
  products,
  familyStatus,
  categoryStatus,
  onRenameFamily,
  onRenameCategory,
  onRenameProduct,
  onToggleFamily,
  onToggleCategory,
  onToggleProduct,
}: InventoryCatalogSettingsProps) {
  const [tab, setTab] = useState<CatalogTab>("FAMILIES");
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editName, setEditName] = useState("");

  const openEdit = (target: EditTarget) => {
    setEditTarget(target);
    setEditName(target.label);
  };

  const saveEdit = () => {
    const nextName = editName.trim();
    if (!editTarget || !nextName) return;
    if (editTarget.type === "FAMILY")
      onRenameFamily(editTarget.id, nextName);
    if (editTarget.type === "CATEGORY")
      onRenameCategory(editTarget.id, nextName);
    if (editTarget.type === "PRODUCT")
      onRenameProduct(editTarget.id, nextName);
    setEditTarget(null);
    setEditName("");
  };

  return (
    <>
      <Card className="settings-card inventory-catalog-settings-card">
        <CardContent>
          <div className="inventory-settings-heading">
            <div>
              <span className="section-kicker">INVENTARIO · CATÁLOGOS</span>
              <h2>Familias, categorías y productos</h2>
              <p>
                Los cambios de nombre se propagan a los registros relacionados.
                Inactivar sólo retira el elemento de la operación actual y
                conserva el historial.
              </p>
            </div>
            <FolderTree size={24} />
          </div>
          <div className="segmented-control inventory-settings-tabs">
            {(
              [
                ["FAMILIES", "Familias", families.length],
                ["CATEGORIES", "Categorías", categories.length],
                ["PRODUCTS", "Productos", products.length],
              ] as const
            ).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                className={tab === value ? "is-active" : ""}
                onClick={() => setTab(value)}
              >
                {value === "FAMILIES" ? (
                  <FolderTree size={15} />
                ) : value === "CATEGORIES" ? (
                  <Tags size={15} />
                ) : (
                  <Boxes size={15} />
                )}
                {label} <strong>{count}</strong>
              </button>
            ))}
          </div>
          <div className="table-scroll inventory-settings-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>REGISTRO</TableHead>
                  <TableHead>USO ACTUAL</TableHead>
                  <TableHead>ESTADO</TableHead>
                  <TableHead>ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tab === "FAMILIES" &&
                  families.map((family) => {
                    const active = familyStatus[family] !== false;
                    const count = products.filter(
                      (product) => product.family === family,
                    ).length;
                    return (
                      <TableRow key={family} className={active ? "" : "is-muted"}>
                        <TableCell><strong>{family}</strong></TableCell>
                        <TableCell>{count} productos o servicios</TableCell>
                        <TableCell><Badge variant={active ? "default" : "outline"}>{active ? "ACTIVA" : "INACTIVA"}</Badge></TableCell>
                        <TableCell><div className="inventory-settings-actions"><Button type="button" variant="outline" size="icon" className="icon-action-button" title="Editar" aria-label={`Editar ${family}`} onClick={() => openEdit({ type: "FAMILY", id: family, label: family })}><Pencil size={15} /></Button><Button type="button" variant="outline" size="icon" className="icon-action-button" title={active ? "Inactivar" : "Activar"} aria-label={`${active ? "Inactivar" : "Activar"} ${family}`} onClick={() => onToggleFamily(family, !active)}>{active ? <PowerOff size={15} /> : <Power size={15} />}</Button></div></TableCell>
                      </TableRow>
                    );
                  })}
                {tab === "CATEGORIES" &&
                  categories.map((category) => {
                    const active = categoryStatus[category] !== false;
                    const count = products.filter(
                      (product) => product.category === category,
                    ).length;
                    return (
                      <TableRow key={category} className={active ? "" : "is-muted"}>
                        <TableCell><strong>{category}</strong></TableCell>
                        <TableCell>{count} productos o servicios</TableCell>
                        <TableCell><Badge variant={active ? "default" : "outline"}>{active ? "ACTIVA" : "INACTIVA"}</Badge></TableCell>
                        <TableCell><div className="inventory-settings-actions"><Button type="button" variant="outline" size="icon" className="icon-action-button" title="Editar" aria-label={`Editar ${category}`} onClick={() => openEdit({ type: "CATEGORY", id: category, label: category })}><Pencil size={15} /></Button><Button type="button" variant="outline" size="icon" className="icon-action-button" title={active ? "Inactivar" : "Activar"} aria-label={`${active ? "Inactivar" : "Activar"} ${category}`} onClick={() => onToggleCategory(category, !active)}>{active ? <PowerOff size={15} /> : <Power size={15} />}</Button></div></TableCell>
                      </TableRow>
                    );
                  })}
                {tab === "PRODUCTS" &&
                  products.map((product) => (
                    <TableRow key={product.id} className={product.active ? "" : "is-muted"}>
                      <TableCell><div className="inventory-settings-product"><img src={product.image} alt="" /><span><strong>{product.name}</strong><small>{getSellerSku(product)}</small></span></div></TableCell>
                      <TableCell>{product.family} · {product.category}</TableCell>
                      <TableCell><Badge variant={product.active ? "default" : "outline"}>{product.active ? "ACTIVO" : "INACTIVO"}</Badge></TableCell>
                      <TableCell><div className="inventory-settings-actions"><Button type="button" variant="outline" size="icon" className="icon-action-button" title="Editar" aria-label={`Editar ${product.name}`} onClick={() => openEdit({ type: "PRODUCT", id: product.id, label: product.name })}><Pencil size={15} /></Button><Button type="button" variant="outline" size="icon" className="icon-action-button" title={product.active ? "Inactivar" : "Activar"} aria-label={`${product.active ? "Inactivar" : "Activar"} ${product.name}`} onClick={() => onToggleProduct(product.id, !product.active)}>{product.active ? <PowerOff size={15} /> : <Power size={15} />}</Button></div></TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={Boolean(editTarget)} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Editar {editTarget?.type === "FAMILY" ? "familia" : editTarget?.type === "CATEGORY" ? "categoría" : "producto"}</DialogTitle>
          </DialogHeader>
          <Input value={editName} onChange={(event) => setEditName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && saveEdit()} aria-label="Nuevo nombre del registro" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button type="button" onClick={saveEdit} disabled={!editName.trim()}><Pencil size={14} /> Guardar nombre</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
