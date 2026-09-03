import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  PackageCheck,
  Pencil,
  Plus,
  Settings2,
  ShoppingBag,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Card,
  CardContent,
  DatePicker,
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
  CompetitionType,
  Product,
  SalesCompetition,
} from "../types";

interface CompetitionSettingsProps {
  open: boolean;
  authorized: boolean;
  competitions: SalesCompetition[];
  products: Product[];
  branches: string[];
  onOpenChange: (open: boolean) => void;
  onAuthorize: (code: string) => boolean;
  onLock: () => void;
  onSave: (competition: SalesCompetition) => void;
  onToggle: (competitionId: string) => void;
  onDelete: (competitionId: string) => void;
}

interface CompetitionForm {
  id: string;
  name: string;
  type: CompetitionType;
  dateFrom: string;
  dateTo: string;
  branch: string;
  targetAmount: string;
  productId: string;
  packageProductIds: string[];
}

const businessToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const emptyForm = (): CompetitionForm => ({
  id: "",
  name: "",
  type: "AMOUNT",
  dateFrom: businessToday(),
  dateTo: businessToday(),
  branch: "ALL",
  targetAmount: "2500",
  productId: "",
  packageProductIds: [],
});

const typeLabels: Record<CompetitionType, string> = {
  AMOUNT: "Por monto",
  PRODUCT: "Por producto",
  PACKAGE: "Por paquete",
  PERIOD: "Por periodo",
};

export function CompetitionSettings({
  open,
  authorized,
  competitions,
  products,
  branches,
  onOpenChange,
  onAuthorize,
  onLock,
  onSave,
  onToggle,
  onDelete,
}: CompetitionSettingsProps) {
  const [accessCode, setAccessCode] = useState("");
  const [form, setForm] = useState<CompetitionForm>(emptyForm);
  const activeProducts = useMemo(
    () => products.filter((product) => product.active),
    [products],
  );

  useEffect(() => {
    if (!open) {
      setAccessCode("");
      setForm(emptyForm());
    }
  }, [open]);

  const authorize = () => {
    if (onAuthorize(accessCode.trim())) {
      setAccessCode("");
      toast.success("Configuración de competiciones desbloqueada.");
      return;
    }
    toast.error("Código master incorrecto.");
  };

  const editCompetition = (competition: SalesCompetition) => {
    setForm({
      id: competition.id,
      name: competition.name,
      type: competition.type,
      dateFrom: competition.dateFrom,
      dateTo: competition.dateTo,
      branch: competition.branch,
      targetAmount: competition.targetAmount?.toString() ?? "",
      productId: competition.productId ?? "",
      packageProductIds: competition.packageProductIds,
    });
  };

  const saveCompetition = () => {
    if (!form.name.trim()) {
      toast.error("Escribe un nombre para la competencia.");
      return;
    }
    if (!form.dateFrom || !form.dateTo || form.dateFrom > form.dateTo) {
      toast.error("Selecciona un periodo válido.");
      return;
    }
    if (form.type === "PRODUCT" && !form.productId) {
      toast.error("Selecciona el producto que se contará.");
      return;
    }
    if (form.type === "PACKAGE" && form.packageProductIds.length < 2) {
      toast.error("Un paquete debe contener al menos dos productos o servicios.");
      return;
    }
    onSave({
      id: form.id || `competition-${crypto.randomUUID()}`,
      name: form.name.trim(),
      type: form.type,
      active: form.id
        ? (competitions.find((competition) => competition.id === form.id)?.active ?? true)
        : true,
      dateFrom: form.dateFrom,
      dateTo: form.dateTo,
      branch: form.branch,
      targetAmount:
        form.type === "AMOUNT" && Number(form.targetAmount) > 0
          ? Number(form.targetAmount)
          : null,
      productId: form.type === "PRODUCT" ? form.productId : null,
      packageProductIds:
        form.type === "PACKAGE" ? form.packageProductIds : [],
      createdAtIso:
        competitions.find((competition) => competition.id === form.id)?.createdAtIso ??
        new Date().toISOString(),
    });
    toast.success(form.id ? "Competencia actualizada." : "Competencia creada y activa.");
    setForm(emptyForm());
  };

  const togglePackageProduct = (productId: string) => {
    setForm((current) => ({
      ...current,
      packageProductIds: current.packageProductIds.includes(productId)
        ? current.packageProductIds.filter((id) => id !== productId)
        : [...current.packageProductIds, productId],
    }));
  };

  return (
    <>
      <Card className="settings-card competition-settings-card">
        <CardContent>
          <div className="competition-settings-card-heading">
            <div>
              <span className="section-kicker">COMPETICIONES</span>
              <h2>Reglas y tipos de conteo</h2>
            </div>
            <Trophy size={25} />
          </div>
          <p>
            Crea retos por monto, producto, paquete o periodo. El tablero de
            Competition usa estas reglas para calcular el ranking.
          </p>
          <div className="competition-settings-summary">
            <span><strong>{competitions.length}</strong> configuradas</span>
            <span><strong>{competitions.filter((competition) => competition.active).length}</strong> activas</span>
            <span><strong>4</strong> tipos</span>
          </div>
          <Button type="button" onClick={() => onOpenChange(true)}>
            <Settings2 size={16} /> Configurar competiciones
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="competition-settings-dialog sm:max-w-[980px]">
          <DialogHeader>
            <DialogTitle>Configuración de competiciones</DialogTitle>
            <DialogDescription>
              Define qué tickets cuentan y cómo se ordena a los vendedores.
            </DialogDescription>
          </DialogHeader>

          {!authorized ? (
            <div className="competition-settings-gate">
              <div><LockKeyhole size={28} /></div>
              <span className="section-kicker">ACCESO MASTER</span>
              <h3>Protege las reglas del concurso</h3>
              <p>Ingresa el código master para crear, editar, activar o inactivar competiciones.</p>
              <div>
                <KeyRound size={17} />
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") authorize();
                  }}
                  placeholder="Código master"
                  aria-label="Código master para competiciones"
                />
                <Button type="button" onClick={authorize} disabled={accessCode.length !== 4}>
                  Desbloquear
                </Button>
              </div>
              <small>Código estático de prueba: 2468</small>
            </div>
          ) : (
            <div className="competition-settings-workspace">
              <section className="competition-editor">
                <div className="competition-editor-heading">
                  <div>
                    <span className="section-kicker">{form.id ? "EDITAR REGLA" : "NUEVA REGLA"}</span>
                    <h3>{form.id ? "Actualizar competencia" : "Crear competencia"}</h3>
                  </div>
                  {form.id && <Badge variant="outline">Edición</Badge>}
                </div>
                <div className="competition-type-grid">
                  {(
                    [
                      ["AMOUNT", Target, "Gana quien acumula mayor venta"],
                      ["PRODUCT", ShoppingBag, "Cuenta unidades de un artículo"],
                      ["PACKAGE", PackageCheck, "Cuenta paquetes completos"],
                      ["PERIOD", CalendarRange, "Venta acumulada entre fechas"],
                    ] as const
                  ).map(([type, Icon, description]) => (
                    <button
                      key={type}
                      type="button"
                      className={form.type === type ? "is-selected" : ""}
                      onClick={() => setForm((current) => ({ ...current, type }))}
                    >
                      <Icon size={18} />
                      <strong>{typeLabels[type]}</strong>
                      <span>{description}</span>
                    </button>
                  ))}
                </div>
                <div className="competition-form-grid">
                  <div className="field-stack is-wide">
                    <Label>Nombre de la competencia</Label>
                    <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Reto Sérum de agosto" />
                  </div>
                  <div className="field-stack">
                    <Label>Desde</Label>
                    <DatePicker value={form.dateFrom} onChange={(value) => setForm((current) => ({ ...current, dateFrom: value }))} placeholder="Fecha inicial" />
                  </div>
                  <div className="field-stack">
                    <Label>Hasta</Label>
                    <DatePicker value={form.dateTo} onChange={(value) => setForm((current) => ({ ...current, dateTo: value }))} placeholder="Fecha final" />
                  </div>
                  <div className="field-stack">
                    <Label>Sucursal</Label>
                    <Select value={form.branch} onValueChange={(branch) => setForm((current) => ({ ...current, branch }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todas las sucursales</SelectItem>
                        {branches.map((branch) => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.type === "AMOUNT" && (
                    <div className="field-stack">
                      <Label>Meta individual ($)</Label>
                      <Input type="number" min="0" value={form.targetAmount} onChange={(event) => setForm((current) => ({ ...current, targetAmount: event.target.value }))} />
                    </div>
                  )}
                  {form.type === "PRODUCT" && (
                    <div className="field-stack is-wide">
                      <Label>Producto o servicio a contar</Label>
                      <Select value={form.productId} onValueChange={(productId) => setForm((current) => ({ ...current, productId }))}>
                        <SelectTrigger><SelectValue placeholder="Selecciona producto" /></SelectTrigger>
                        <SelectContent>
                          {activeProducts.map((product) => <SelectItem key={product.id} value={product.id}>{product.name} · {product.sku}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                {form.type === "PACKAGE" && (
                  <div className="competition-package-picker">
                    <Label>Productos o servicios del paquete</Label>
                    <p>El paquete cuenta cuando un mismo ticket contiene todos los seleccionados.</p>
                    <div>
                      {activeProducts.map((product) => {
                        const selected = form.packageProductIds.includes(product.id);
                        return (
                          <button key={product.id} type="button" className={selected ? "is-selected" : ""} onClick={() => togglePackageProduct(product.id)}>
                            {selected ? <CheckCircle2 size={15} /> : <Plus size={15} />}
                            <span><strong>{product.name}</strong><small>{product.sku}</small></span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="competition-editor-actions">
                  {form.id && <Button type="button" variant="outline" onClick={() => setForm(emptyForm())}>Cancelar edición</Button>}
                  <Button type="button" onClick={saveCompetition}>
                    {form.id ? <Pencil size={15} /> : <Plus size={15} />}
                    {form.id ? "Guardar cambios" : "Crear competencia"}
                  </Button>
                </div>
              </section>

              <section className="competition-config-list">
                <div className="competition-editor-heading">
                  <div>
                    <span className="section-kicker">CONFIGURADAS</span>
                    <h3>Reglas disponibles</h3>
                  </div>
                  <Badge>{competitions.length}</Badge>
                </div>
                <div>
                  {competitions.map((competition) => (
                    <article key={competition.id} className={competition.active ? "" : "is-inactive"}>
                      <div className="competition-config-icon">
                        {competition.type === "PRODUCT" ? <ShoppingBag size={17} /> : competition.type === "PACKAGE" ? <PackageCheck size={17} /> : competition.type === "PERIOD" ? <CalendarRange size={17} /> : <Target size={17} />}
                      </div>
                      <div>
                        <strong>{competition.name}</strong>
                        <span>{typeLabels[competition.type]} · {competition.branch === "ALL" ? "Todas las sucursales" : competition.branch}</span>
                        <small>{competition.dateFrom} — {competition.dateTo}</small>
                      </div>
                      <Badge variant={competition.active ? "default" : "outline"}>{competition.active ? "ACTIVA" : "INACTIVA"}</Badge>
                      <div className="competition-config-actions">
                        <Button type="button" size="icon" variant="ghost" onClick={() => editCompetition(competition)} aria-label={`Editar ${competition.name}`}><Pencil size={14} /></Button>
                        <Button type="button" size="icon" variant="ghost" onClick={() => onToggle(competition.id)} aria-label={competition.active ? `Inactivar ${competition.name}` : `Activar ${competition.name}`}><CheckCircle2 size={14} /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button type="button" size="icon" variant="ghost" aria-label={`Borrar ${competition.name}`}><Trash2 size={14} /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Borrar {competition.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                La regla se retirará del tablero de esta sesión mock. Los tickets que participaron no serán modificados.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Conservar</AlertDialogCancel>
                              <AlertDialogAction className="icon-action-button is-danger" onClick={() => onDelete(competition.id)} aria-label={`Borrar ${competition.name}`} title="Borrar"><Trash2 size={15} /></AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </article>
                  ))}
                  {competitions.length === 0 && <p className="competition-config-empty">Todavía no hay reglas configuradas.</p>}
                </div>
              </section>
            </div>
          )}

          <DialogFooter>
            {authorized && (
              <Button type="button" variant="outline" onClick={onLock}>
                <LockKeyhole size={15} /> Bloquear configuración
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
