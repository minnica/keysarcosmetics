import { useState } from "react";
import {
  CheckCircle2,
  Gift,
  LockKeyhole,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
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
import type { VoucherIssue, VoucherKind, VoucherTemplate } from "../types";

interface VoucherSettingsProps {
  templates: VoucherTemplate[];
  issues: VoucherIssue[];
  isMasterCode: (code: string) => boolean;
  onChangeTemplates: (templates: VoucherTemplate[]) => void;
  onChangeIssues: (issues: VoucherIssue[]) => void;
}

const kindLabels: Record<VoucherKind, string> = {
  NEXT_PURCHASE_DISCOUNT: "Descuento en próxima compra",
  COMPANION_FACIAL: "Facial para acompañante",
  MEMBERSHIP_DISCOUNT: "Descuento en membresía",
};

const emptyDraft = (): VoucherTemplate => ({
  id: "",
  name: "",
  kind: "NEXT_PURCHASE_DISCOUNT",
  value: 10,
  message: "Presenta este voucher en tu próxima visita.",
  active: true,
  visibleToSellers: true,
});

export function VoucherSettings({
  templates,
  issues,
  isMasterCode,
  onChangeTemplates,
  onChangeIssues,
}: VoucherSettingsProps) {
  const [authorized, setAuthorized] = useState(false);
  const [code, setCode] = useState("");
  const [editing, setEditing] = useState<VoucherTemplate | null>(null);

  const authorize = () => {
    if (!isMasterCode(code)) {
      toast.error("Código master incorrecto.");
      return;
    }
    setAuthorized(true);
    setCode("");
  };

  const save = () => {
    if (!editing?.name.trim() || !editing.message.trim()) {
      toast.error("Nombre y mensaje son obligatorios.");
      return;
    }
    const saved = {
      ...editing,
      id: editing.id || `voucher-${crypto.randomUUID()}`,
      name: editing.name.trim(),
      message: editing.message.trim(),
      value: Math.max(0, editing.value),
    };
    onChangeTemplates(
      editing.id
        ? templates.map((template) =>
            template.id === editing.id ? saved : template,
          )
        : [saved, ...templates],
    );
    setEditing(null);
    toast.success(editing.id ? "Voucher actualizado." : "Voucher creado.");
  };

  const patchTemplate = (id: string, patch: Partial<VoucherTemplate>) =>
    onChangeTemplates(
      templates.map((template) =>
        template.id === id ? { ...template, ...patch } : template,
      ),
    );

  return (
    <Card className="settings-card voucher-settings-card">
      <CardContent>
        <div className="voucher-settings-heading">
          <div>
            <span className="section-kicker">PROMOCIONES POSTVENTA</span>
            <h2>Vouchers promocionales</h2>
            <p>
              Configura qué promociones puede elegir e imprimir el vendedor al
              terminar una venta y consulta su canje por folio.
            </p>
          </div>
          <Gift size={25} />
        </div>

        {!authorized ? (
          <div className="master-settings-gate">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && authorize()}
              placeholder="Código master"
            />
            <Button type="button" onClick={authorize} disabled={code.length !== 4}>
              <ShieldCheck size={15} /> Administrar vouchers
            </Button>
            <small>Los vendedores sólo verán los vouchers publicados.</small>
          </div>
        ) : (
          <>
            <div className="voucher-toolbar">
              <Button type="button" onClick={() => setEditing(emptyDraft())}>
                <Plus size={15} /> Crear voucher
              </Button>
              <Button type="button" variant="outline" onClick={() => setAuthorized(false)}>
                <LockKeyhole size={14} /> Bloquear
              </Button>
            </div>
            <div className="voucher-template-list">
              {templates.map((template) => (
                <article key={template.id} className={!template.active ? "is-inactive" : ""}>
                  <span className="voucher-template-icon"><Gift size={17} /></span>
                  <span>
                    <strong>{template.name}</strong>
                    <small>{kindLabels[template.kind]} · {template.value}%</small>
                  </span>
                  <label className="voucher-switch-label">
                    <small>Activo</small>
                    <button
                      type="button"
                      className={`mock-switch ${template.active ? "is-on" : ""}`}
                      role="switch"
                      aria-checked={template.active}
                      onClick={() => patchTemplate(template.id, { active: !template.active })}
                    ><i /></button>
                  </label>
                  <label className="voucher-switch-label">
                    <small>Visible</small>
                    <button
                      type="button"
                      className={`mock-switch ${template.visibleToSellers ? "is-on" : ""}`}
                      role="switch"
                      aria-checked={template.visibleToSellers}
                      onClick={() => patchTemplate(template.id, { visibleToSellers: !template.visibleToSellers })}
                    ><i /></button>
                  </label>
                  <Button type="button" variant="ghost" size="icon" title="Editar" aria-label={`Editar ${template.name}`} onClick={() => setEditing({ ...template })}>
                    <Pencil size={15} />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" title="Borrar" aria-label={`Borrar ${template.name}`} onClick={() => onChangeTemplates(templates.filter((item) => item.id !== template.id))}>
                    <Trash2 size={15} />
                  </Button>
                </article>
              ))}
            </div>
          </>
        )}

        {editing && authorized && (
          <div className="voucher-editor">
            <div className="voucher-editor-heading">
              <strong>{editing.id ? "Editar voucher" : "Nuevo voucher"}</strong>
              <Button type="button" variant="ghost" size="icon" title="Cerrar" onClick={() => setEditing(null)}><X size={15} /></Button>
            </div>
            <Input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} placeholder="Nombre del voucher" />
            <Select value={editing.kind} onValueChange={(kind) => setEditing({ ...editing, kind: kind as VoucherKind })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(kindLabels).map(([kind, label]) => <SelectItem key={kind} value={kind}>{label}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" min="0" value={editing.value} onChange={(event) => setEditing({ ...editing, value: Number(event.target.value) })} aria-label="Valor porcentual" />
            <textarea value={editing.message} onChange={(event) => setEditing({ ...editing, message: event.target.value })} placeholder="Mensaje impreso" />
            <Button type="button" onClick={save}><CheckCircle2 size={15} /> Guardar voucher</Button>
          </div>
        )}

        <div className="voucher-register-heading">
          <div><span className="section-kicker">SEGUIMIENTO</span><h3>Registro de vouchers emitidos</h3></div>
          <Badge variant="outline">{issues.length} folios</Badge>
        </div>
        <div className="table-scroll voucher-register-table">
          <Table>
            <TableHeader><TableRow><TableHead>FOLIO</TableHead><TableHead>CLIENTE</TableHead><TableHead>VOUCHER</TableHead><TableHead>SUCURSAL</TableHead><TableHead>ESTATUS</TableHead><TableHead>ACCIÓN</TableHead></TableRow></TableHeader>
            <TableBody>
              {issues.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell><strong>{issue.folio}</strong></TableCell>
                  <TableCell>{issue.clientName}</TableCell>
                  <TableCell>{issue.voucherName}</TableCell>
                  <TableCell>{issue.branch}</TableCell>
                  <TableCell><Badge variant="outline">{issue.status === "ISSUED" ? "POR CANJEAR" : issue.status === "REDEEMED" ? "CANJEADO" : "CANCELADO"}</Badge></TableCell>
                  <TableCell>
                    {authorized && issue.status === "ISSUED" && (
                      <Button type="button" variant="outline" size="sm" onClick={() => onChangeIssues(issues.map((item) => item.id === issue.id ? { ...item, status: "REDEEMED", redeemedAtIso: new Date().toISOString() } : item))}>Canjear</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {issues.length === 0 && <TableRow><TableCell colSpan={6}>Aún no hay vouchers emitidos.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
