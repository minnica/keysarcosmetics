import { useState } from "react";
import { Archive, Pencil, Plus, Power, PowerOff, Trash2, Warehouse } from "lucide-react";
import { Badge, Button, Card, CardContent, Input } from "@cosmetics/ui";
import type { WarehouseMovementCategory } from "../types";

interface WarehouseSettingsProps {
  categories: WarehouseMovementCategory[];
  canManage: boolean;
  onSave: (id: string | null, name: string) => boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function WarehouseSettings({
  categories,
  canManage,
  onSave,
  onToggle,
  onDelete,
}: WarehouseSettingsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");

  const submit = () => {
    if (!name.trim() || !onSave(editingId, name.trim())) return;
    setEditingId(null);
    setName("");
  };

  return (
    <Card className="settings-card warehouse-settings-card">
      <CardContent>
        <div className="warehouse-settings-heading">
          <div>
            <span className="section-kicker">ALMACÉN MATRIZ</span>
            <h2>Conceptos de envíos</h2>
            <p>
              Configura los submenús operativos. Inactivar o borrar una opción
              no modifica el nombre guardado en movimientos anteriores.
            </p>
          </div>
          <Warehouse size={25} />
        </div>

        <div className="warehouse-settings-list">
          {categories.map((category) => (
            <div key={category.id}>
              <span className="warehouse-setting-icon"><Archive size={16} /></span>
              <span>
                <strong>{category.name}</strong>
                <small>Disponible en envíos de bodega</small>
              </span>
              <Badge variant="outline">{category.active ? "ACTIVO" : "INACTIVO"}</Badge>
              {canManage && (
                <div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(category.id);
                      setName(category.name);
                    }}
                  >
                    <Pencil size={14} /> Editar
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => onToggle(category.id)}>
                    {category.active ? <PowerOff size={14} /> : <Power size={14} />}
                    {category.active ? "Inactivar" : "Activar"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => onDelete(category.id)}>
                    <Trash2 size={14} /> Borrar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {canManage ? (
          <div className="warehouse-setting-form">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
              placeholder="Ej. Envío de exhibidores"
            />
            <Button type="button" onClick={submit} disabled={!name.trim()}>
              {editingId ? <Pencil size={15} /> : <Plus size={15} />}
              {editingId ? "Guardar cambio" : "Agregar concepto"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={() => { setEditingId(null); setName(""); }}>
                Cancelar
              </Button>
            )}
          </div>
        ) : (
          <div className="warehouse-settings-protected">
            Sólo un usuario con permiso de movimientos de almacén puede modificar estos conceptos.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
