import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CloudDownload,
  DatabaseZap,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Badge, Button, Card, CardContent, toast } from "@cosmetics/ui";

type UpdateStatus = "CURRENT" | "PENDING" | "UPDATING";

interface UpdateModule {
  id: string;
  name: string;
  description: string;
  installedVersion: number;
  availableVersion: number;
  status: UpdateStatus;
  lastUpdated: string;
}

const initialModules: UpdateModule[] = [
  {
    id: "catalog",
    name: "Catálogo de productos",
    description: "Productos, precios, SKU, familias y fotografías.",
    installedVersion: 42,
    availableVersion: 44,
    status: "PENDING",
    lastUpdated: "Hoy · 09:18",
  },
  {
    id: "inventory",
    name: "Inventario",
    description: "Existencias, mínimos, máximos y movimientos autorizados.",
    installedVersion: 86,
    availableVersion: 87,
    status: "PENDING",
    lastUpdated: "Hoy · 10:05",
  },
  {
    id: "customers",
    name: "Clientes",
    description: "Carteras, procedencia y asignación de vendedores.",
    installedVersion: 31,
    availableVersion: 31,
    status: "CURRENT",
    lastUpdated: "Hoy · 11:40",
  },
  {
    id: "sales",
    name: "Tickets y cobros",
    description: "Ventas, pagos, apartados y saldos pendientes.",
    installedVersion: 118,
    availableVersion: 120,
    status: "PENDING",
    lastUpdated: "Ayer · 20:02",
  },
  {
    id: "settings",
    name: "Configuración del POS",
    description: "Métodos de pago, impresión y reglas operativas.",
    installedVersion: 17,
    availableVersion: 17,
    status: "CURRENT",
    lastUpdated: "22 ago · 08:30",
  },
];

const currentTime = () =>
  new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

interface DataUpdateViewProps {
  lastUpdatedAt: number;
  nextUpdateAt: number;
  updating: boolean;
  revision: number;
  now: number;
  onRequestSync: () => void;
}

export function DataUpdateView({
  lastUpdatedAt,
  nextUpdateAt,
  updating,
  revision,
  now,
  onRequestSync,
}: DataUpdateViewProps) {
  const [modules, setModules] = useState(initialModules);
  const updatingCount = modules.filter(
    (module) => module.status === "UPDATING",
  ).length;
  const progress = useMemo(
    () =>
      Math.round(
        (modules.filter((module) => module.status === "CURRENT").length /
          modules.length) *
          100,
      ),
    [modules],
  );
  const secondsUntilNextUpdate = Math.max(
    0,
    Math.ceil((nextUpdateAt - now) / 1_000),
  );
  const nextUpdateCountdown = `${String(Math.floor(secondsUntilNextUpdate / 60)).padStart(2, "0")}:${String(secondsUntilNextUpdate % 60).padStart(2, "0")}`;
  const lastUpdateLabel = new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(lastUpdatedAt));

  useEffect(() => {
    if (!updating) return;
    setModules((current) =>
      current.map((module) => ({ ...module, status: "UPDATING" })),
    );
  }, [updating]);

  useEffect(() => {
    setModules((current) =>
      current.map((module) => ({
        ...module,
        installedVersion: module.availableVersion,
        status: "CURRENT",
        lastUpdated: `Hoy · ${currentTime()}`,
      })),
    );
  }, [revision]);

  const updateModules = (moduleIds: string[]) => {
    if (moduleIds.length === 0) return;
    setModules((current) =>
      current.map((module) =>
        moduleIds.includes(module.id)
          ? { ...module, status: "UPDATING" }
          : module,
      ),
    );
    window.setTimeout(() => {
      setModules((current) =>
        current.map((module) =>
          moduleIds.includes(module.id)
            ? {
                ...module,
                installedVersion: module.availableVersion,
                status: "CURRENT",
                lastUpdated: `Hoy · ${currentTime()}`,
              }
            : module,
        ),
      );
      toast.success(
        moduleIds.length === 1
          ? "Módulo actualizado manualmente."
          : `${moduleIds.length} módulos actualizados manualmente.`,
      );
    }, 850);
  };

  return (
    <div className="data-update-view">
      <Card className="data-update-summary">
        <CardContent>
          <div>
            <span className="section-kicker">SINCRONIZACIÓN AUTOMÁTICA</span>
            <h2>Estado de módulos</h2>
            <p>
              La sesión revisa y actualiza todos los módulos automáticamente
              cada minuto, incluso mientras trabajas en otra pantalla.
            </p>
            <div className="data-update-live-clock" aria-live="polite">
              <span>
                <CheckCircle2 size={14} /> Última actualización {lastUpdateLabel}
              </span>
              <span>
                <RefreshCw className={updating ? "is-spinning" : ""} size={14} />
                {updating
                  ? "Actualizando módulos…"
                  : `Siguiente actualización en ${nextUpdateCountdown}`}
              </span>
            </div>
          </div>
          <div className="data-update-progress">
            <strong>{progress}%</strong>
            <span>terminal actualizada</span>
            <i>
              <b style={{ width: `${progress}%` }} />
            </i>
          </div>
          <Button
            type="button"
            onClick={onRequestSync}
            disabled={updating || updatingCount > 0}
          >
            {updating || updatingCount > 0 ? (
              <Loader2 className="is-spinning" size={16} />
            ) : (
              <CloudDownload size={16} />
            )}
            {updating ? "Actualizando…" : "Sincronizar ahora"}
          </Button>
        </CardContent>
      </Card>

      <div className="update-module-list">
        {modules.map((module) => (
          <Card
            key={module.id}
            className={`update-module-card status-${module.status.toLocaleLowerCase("en-US")}`}
          >
            <CardContent>
              <div className="update-module-icon">
                {module.status === "CURRENT" ? (
                  <CheckCircle2 size={21} />
                ) : module.status === "UPDATING" ? (
                  <Loader2 className="is-spinning" size={21} />
                ) : (
                  <DatabaseZap size={21} />
                )}
              </div>
              <div className="update-module-copy">
                <span>
                  <strong>{module.name}</strong>
                  <Badge
                    variant={
                      module.status === "CURRENT" ? "default" : "outline"
                    }
                  >
                    {module.status === "CURRENT"
                      ? "ACTUALIZADO"
                      : module.status === "UPDATING"
                        ? "ACTUALIZANDO"
                        : "REQUIERE ACTUALIZACIÓN"}
                  </Badge>
                </span>
                <p>{module.description}</p>
                <small>
                  Versión local {module.installedVersion} · Disponible{" "}
                  {module.availableVersion} · Última actualización{" "}
                  {module.lastUpdated}
                </small>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateModules([module.id])}
                disabled={module.status !== "PENDING" || updatingCount > 0}
              >
                {module.status === "UPDATING" ? (
                  <Loader2 className="is-spinning" size={14} />
                ) : (
                  <RefreshCw size={14} />
                )}
                {module.status === "CURRENT" ? "Al día" : "Actualizar"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="data-update-disclaimer">
        Demostración frontend: la actualización es simulada y no descarga datos
        de un servidor.
      </p>
    </div>
  );
}
