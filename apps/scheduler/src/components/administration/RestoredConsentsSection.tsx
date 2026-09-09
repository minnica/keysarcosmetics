"use client";

import { useEffect, useState, type ChangeEvent, type DragEvent } from "react";
import type {
  SchedulerConsentRecordDto,
  SchedulerConsentTemplateDto,
  SchedulerOperationalCatalogDto,
} from "@cosmetics/types";
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
  Textarea,
  toast,
} from "@cosmetics/ui";
import {
  ClipboardCheck,
  Eye,
  FileCheck2,
  FileText,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { schedulerApi, schedulerApiErrorMessage } from "@/lib/api";
import { formatSchedulerFileSize } from "@/lib/scheduler-engagement-presentation";
import { useSchedulerSession } from "@/lib/session";
import {
  QueryBoundary,
  invalidateSchedulerQueries,
  runSchedulerMutation,
  useSchedulerQuery,
} from "@/components/api/ApiState";
import {
  AdministrationCoverageNotice,
  AdministrationRefreshButton,
  RestoredAdministrationFrame,
} from "./RestoredAdministrationFrame";

const controlClass =
  "admin-input h-11 rounded-xl border-[#ded5cc] bg-white focus-visible:ring-[#c3a583]";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function commerceOptions(catalog: SchedulerOperationalCatalogDto | null) {
  if (!catalog) return [];
  const available = new Set(
    catalog.branches.map((branch) => branch.commerceId),
  );
  return catalog.commerces.filter((commerce) => available.has(commerce.id));
}

function ConsentDropzone({
  file,
  onFile,
}: {
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  function acceptFile(next: File | undefined) {
    if (!next) return;
    if (next.size > 5 * 1024 * 1024) {
      toast.error("El archivo no puede superar 5 MB.");
      return;
    }
    onFile(next);
  }
  return (
    <div className="consent-file-field">
      <div className="consent-file-label-row">
        <div>
          <p className="admin-label">Archivo privado</p>
          <p className="admin-help">PDF, DOC, DOCX, JPG o PNG · máximo 5 MB</p>
        </div>
        {file ? (
          <Badge className="consent-file-ready">Archivo listo</Badge>
        ) : null}
      </div>
      <input
        accept="application/pdf,.doc,.docx,image/jpeg,image/png"
        className="sr-only"
        id="consent-private-file"
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          acceptFile(event.target.files?.[0])
        }
        type="file"
      />
      <label
        className={`consent-file-dropzone${file ? " has-file" : ""}`}
        htmlFor="consent-private-file"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event: DragEvent<HTMLLabelElement>) => {
          event.preventDefault();
          acceptFile(event.dataTransfer.files?.[0]);
        }}
      >
        <span className="consent-file-dropzone-icon">
          <Upload className="h-5 w-5" />
        </span>
        <span className="consent-file-dropzone-copy">
          <strong>{file?.name ?? "Arrastra tu documento aquí"}</strong>
          <small>
            {file
              ? "Haz clic para reemplazarlo"
              : "o haz clic para seleccionarlo"}
          </small>
        </span>
        <span className="consent-file-dropzone-action">Seleccionar</span>
      </label>
      <div className="consent-file-note">
        <ShieldCheck className="h-4 w-4" />
        <span>La API nunca publica la ruta interna del archivo.</span>
      </div>
      {file ? (
        <button
          className="consent-file-remove"
          onClick={() => onFile(null)}
          type="button"
        >
          <X className="h-3.5 w-3.5" /> Quitar archivo
        </button>
      ) : null}
    </div>
  );
}

function PrivateDocumentButton({
  kind,
  id,
  label,
}: {
  kind: "consent" | "signed-consent";
  id: string;
  label: string;
}) {
  const { bootstrap } = useSchedulerSession();
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function authorizeAndOpen() {
    const privateWindow = window.open("about:blank", "_blank");
    if (privateWindow) privateWindow.opener = null;
    setLoading(true);
    setError(null);
    try {
      const authorization = await schedulerApi.createAuthorization({
        secret,
        purpose: "PRIVATE_DOCUMENT_DOWNLOAD",
        screenKey: "scheduler/administration/consents",
        targetType: kind,
        targetId: id,
      });
      const temporary = await schedulerApi.privateDocumentUrl(
        kind,
        id,
        authorization.token,
      );
      if (privateWindow) privateWindow.location.replace(temporary.url);
      else window.open(temporary.url, "_blank", "noopener,noreferrer");
      setOpen(false);
      toast.success(
        `Acceso temporal generado por ${temporary.expiresInSeconds} segundos.`,
      );
    } catch (cause) {
      privateWindow?.close();
      setError(
        schedulerApiErrorMessage(cause, "No se pudo abrir el documento."),
      );
    } finally {
      setLoading(false);
      setSecret("");
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" variant="outline">
        <Eye className="mr-2 h-4 w-4" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="admin-dialog max-w-lg overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Abrir documento privado</DialogTitle>
            <DialogDescription>
              La autorización se consume una vez y la URL no se guardará.
            </DialogDescription>
          </DialogHeader>
          <Label htmlFor={`private-secret-${id}`}>Código personal</Label>
          <Input
            autoComplete="one-time-code"
            className={`${controlClass} mt-1.5 tracking-[0.2em]`}
            id={`private-secret-${id}`}
            inputMode="numeric"
            onChange={(event) =>
              setSecret(event.target.value.replace(/\D/g, ""))
            }
            type="password"
            value={secret}
          />
          {!bootstrap?.secondaryAuthorizationConfigured ? (
            <p className="text-sm text-amber-700">
              Configura primero tu código personal.
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-rose-600" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button onClick={() => setOpen(false)} variant="outline">
              Cancelar
            </Button>
            <Button
              disabled={
                !secret ||
                loading ||
                !bootstrap?.secondaryAuthorizationConfigured
              }
              onClick={() => void authorizeAndOpen()}
            >
              {loading ? "Autorizando…" : "Abrir ahora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConsentSignatureButton({
  record,
  onUpdated,
}: {
  record: SchedulerConsentRecordDto;
  onUpdated: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [evidence, setEvidence] = useState("");
  const [saving, setSaving] = useState(false);

  async function sign() {
    if (!file || evidence.trim().length < 16) return;
    const form = new FormData();
    form.set("status", "SIGNED");
    form.set("evidence", evidence.trim());
    form.set("file", file);
    setSaving(true);
    await runSchedulerMutation(
      () => schedulerApi.updateConsentStatus(record.id, form),
      {
        onSuccess: async () => {
          toast.success("Firma registrada con evidencia privada.");
          invalidateSchedulerQueries("consents");
          await onUpdated();
          setOpen(false);
        },
        onError: toast.error,
        onConflict: toast.error,
      },
    );
    setSaving(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <FileCheck2 className="mr-2 h-4 w-4" /> Registrar firma
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="admin-dialog max-w-2xl overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Registrar consentimiento firmado</DialogTitle>
            <DialogDescription>
              La evidencia se convierte a hash y el archivo permanece privado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor={`consent-evidence-${record.id}`}>
                Referencia de evidencia
              </Label>
              <Textarea
                className="admin-textarea mt-1.5"
                id={`consent-evidence-${record.id}`}
                onChange={(event) => setEvidence(event.target.value)}
                placeholder="Describe la evidencia y el contexto de firma"
                value={evidence}
              />
            </div>
            <div>
              <Label htmlFor={`consent-signed-${record.id}`}>
                Documento firmado
              </Label>
              <Input
                accept="application/pdf,.doc,.docx,image/jpeg,image/png"
                className={`${controlClass} mt-1.5`}
                id={`consent-signed-${record.id}`}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                type="file"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button onClick={() => setOpen(false)} variant="outline">
              Cancelar
            </Button>
            <Button
              disabled={!file || evidence.trim().length < 16 || saving}
              onClick={() => void sign()}
            >
              {saving ? "Guardando…" : "Confirmar firma"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConsentRecordsDialog({
  open,
  onOpenChange,
  catalog,
  templates,
  canWrite,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: SchedulerOperationalCatalogDto;
  templates: SchedulerConsentTemplateDto[];
  canWrite: boolean;
}) {
  const [branchId, setBranchId] = useState(
    catalog.branches.find((branch) => branch.active)?.branchId ?? "",
  );
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const customers = useSchedulerQuery(
    () =>
      schedulerApi.searchCustomers({
        query: submittedSearch,
        branchId,
        page: 1,
        pageSize: 10,
      }),
    [submittedSearch, branchId],
    {
      queryKey: "consents:customer-search",
      branchId,
      enabled: open && submittedSearch.length >= 2 && Boolean(branchId),
    },
  );
  const records = useSchedulerQuery(
    () => schedulerApi.consentRecords({ customerId, branchId }),
    [customerId, branchId],
    {
      queryKey: "consents:customer-records",
      branchId,
      enabled: open && Boolean(customerId && branchId),
    },
  );
  const selectedTemplate = templates.find(
    (template) => template.id === templateId,
  );

  useEffect(() => {
    if (!open) {
      setCustomerId("");
      setSubmittedSearch("");
      setSearch("");
    }
  }, [open]);

  async function assign() {
    if (!selectedTemplate?.document || !customerId || !branchId) return;
    await runSchedulerMutation(
      () =>
        schedulerApi.assignConsent({
          templateVersionId: selectedTemplate.document!.id,
          customerId,
          branchId,
        }),
      {
        onSuccess: async () => {
          toast.success("Consentimiento asignado como pendiente.");
          await records.reload();
        },
        onError: toast.error,
        onConflict: toast.error,
        invalidate: ["consents"],
      },
    );
  }

  async function updateStatus(
    record: SchedulerConsentRecordDto,
    status: "DECLINED" | "REVOKED",
  ) {
    const form = new FormData();
    form.set("status", status);
    await runSchedulerMutation(
      () => schedulerApi.updateConsentStatus(record.id, form),
      {
        onSuccess: async () => {
          toast.success(
            status === "DECLINED"
              ? "Consentimiento declinado."
              : "Consentimiento revocado.",
          );
          await records.reload();
        },
        onError: toast.error,
        onConflict: toast.error,
        invalidate: ["consents"],
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-dialog admin-dialog-wide max-h-[calc(100dvh-2rem)] max-w-5xl overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Asignaciones y firmas</DialogTitle>
          <DialogDescription>
            Consulta una clienta dentro de la sucursal autorizada.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="space-y-4 rounded-2xl border border-[#e7ddd4] bg-[#faf8f6] p-4">
            <div>
              <Label htmlFor="consent-branch">Sucursal</Label>
              <Select
                onValueChange={(value) => {
                  setBranchId(value);
                  setCustomerId("");
                }}
                value={branchId}
              >
                <SelectTrigger
                  className={`${controlClass} mt-1.5`}
                  id="consent-branch"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {catalog.branches
                    .filter((branch) => branch.active)
                    .map((branch) => (
                      <SelectItem key={branch.branchId} value={branch.branchId}>
                        {branch.branchName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (search.trim().length >= 2)
                  setSubmittedSearch(search.trim());
              }}
            >
              <Label htmlFor="consent-customer-search">Buscar clienta</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  className={controlClass}
                  id="consent-customer-search"
                  onChange={(event) => setSearch(event.target.value)}
                  value={search}
                />
                <Button
                  aria-label="Buscar clienta"
                  type="submit"
                  variant="outline"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </form>
            {customers.data?.items.map((customer) => (
              <button
                className={`w-full rounded-xl border p-3 text-left transition ${customerId === customer.id ? "border-[#ad8b67] bg-[#f5ede4]" : "border-[#e7ddd4] bg-white hover:border-[#cbb8a6]"}`}
                key={customer.id}
                onClick={() => setCustomerId(customer.id)}
                type="button"
              >
                <span className="block font-medium text-[#263649]">
                  {customer.displayName}
                </span>
                <span className="text-xs text-slate-500">
                  {customer.phone ?? customer.email ?? "Sin contacto"}
                </span>
              </button>
            ))}
            {customerId && canWrite ? (
              <div className="border-t border-[#e7ddd4] pt-4">
                <Label htmlFor="consent-template-version">Consentimiento</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger
                    className={`${controlClass} mt-1.5`}
                    id="consent-template-version"
                  >
                    <SelectValue placeholder="Selecciona documento" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates
                      .filter(
                        (template) => template.active && template.document,
                      )
                      .map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} · v{template.currentVersion}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  className="admin-primary mt-3 w-full"
                  disabled={!selectedTemplate?.document}
                  onClick={() => void assign()}
                >
                  <ClipboardCheck className="mr-2 h-4 w-4" /> Asignar versión
                  exacta
                </Button>
              </div>
            ) : null}
          </section>
          <section>
            <h3 className="admin-section-title">Historial del cliente</h3>
            <p className="mt-1 text-sm text-slate-500">
              Las transiciones se conservan; nunca se elimina una firma.
            </p>
            <QueryBoundary
              empty={Boolean(customerId) && !records.data?.length}
              emptyDescription="No hay consentimientos asignados en esta sucursal."
              error={records.error}
              loading={Boolean(customerId) && records.loading}
              onRetry={() => void records.reload()}
            >
              <div className="mt-4 space-y-3">
                {!customerId ? (
                  <p className="rounded-xl border border-dashed p-5 text-sm text-slate-500">
                    Selecciona una clienta para consultar su historial.
                  </p>
                ) : null}
                {records.data?.map((record) => (
                  <article
                    className="rounded-xl border border-[#e7ddd4] bg-white p-4"
                    key={record.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {record.templateName ?? "Consentimiento"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Versión {record.templateVersion ?? "—"} ·{" "}
                          {record.createdAt
                            ? formatDateTime(record.createdAt)
                            : "Sin fecha"}
                        </p>
                      </div>
                      <Badge variant="outline">{record.status}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {canWrite && record.status === "PENDING" ? (
                        <>
                          <ConsentSignatureButton
                            onUpdated={records.reload}
                            record={record}
                          />
                          <Button
                            onClick={() =>
                              void updateStatus(record, "DECLINED")
                            }
                            size="sm"
                            variant="outline"
                          >
                            Declinar
                          </Button>
                        </>
                      ) : null}
                      {canWrite && record.status === "SIGNED" ? (
                        <Button
                          onClick={() => void updateStatus(record, "REVOKED")}
                          size="sm"
                          variant="outline"
                        >
                          Revocar
                        </Button>
                      ) : null}
                      {record.hasSignedDocument ? (
                        <PrivateDocumentButton
                          id={record.id}
                          kind="signed-consent"
                          label="Abrir firmado"
                        />
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </QueryBoundary>
          </section>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RestoredConsentsSection() {
  const { canAccess } = useSchedulerSession();
  const canAdmin = canAccess("administration.consents", "ADMIN");
  const canWrite = canAccess("administration.consents", "WRITE");
  const catalog = useSchedulerQuery(
    () => schedulerApi.operationalCatalog(),
    [],
    {
      queryKey: "operational-catalog:engagement",
    },
  );
  const templates = useSchedulerQuery(
    () => schedulerApi.consentTemplates(),
    [],
    {
      queryKey: "consents:restored",
    },
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [editing, setEditing] = useState<SchedulerConsentTemplateDto | null>(
    null,
  );
  const [name, setName] = useState("");
  const [commerceId, setCommerceId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  function openEditor(template?: SchedulerConsentTemplateDto) {
    setEditing(template ?? null);
    setName(template?.name ?? "");
    setCommerceId(
      template?.commerceId ?? commerceOptions(catalog.data)[0]?.id ?? "",
    );
    setFile(null);
    setEditorOpen(true);
  }

  async function save() {
    if (!file || !commerceId || name.trim().length < 2) return;
    const form = new FormData();
    form.set("commerceId", commerceId);
    form.set("name", name.trim());
    form.set("file", file);
    setSaving(true);
    await runSchedulerMutation(
      () => schedulerApi.uploadConsentTemplate(form, editing?.id),
      {
        onSuccess: async () => {
          toast.success(
            editing
              ? "Nueva versión del consentimiento cargada."
              : "Consentimiento creado.",
          );
          invalidateSchedulerQueries("consents");
          await templates.reload();
          setEditorOpen(false);
        },
        onError: toast.error,
        onConflict: toast.error,
      },
    );
    setSaving(false);
  }

  const attached = (templates.data ?? []).filter(
    (template) => template.document,
  ).length;
  const active = (templates.data ?? []).filter(
    (template) => template.active,
  ).length;

  return (
    <RestoredAdministrationFrame
      actions={
        <>
          <AdministrationRefreshButton
            loading={templates.loading || catalog.loading}
            onClick={() => {
              void templates.reload();
              void catalog.reload();
            }}
          />
          <Button onClick={() => setRecordsOpen(true)} variant="outline">
            <ClipboardCheck className="mr-2 h-4 w-4" /> Asignaciones
          </Button>
          {canAdmin ? (
            <Button className="admin-primary" onClick={() => openEditor()}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo consentimiento
            </Button>
          ) : null}
        </>
      }
      readOnly={!canAdmin && !canWrite}
      section="consents"
    >
      <div className="consents-overview">
        <div className="consents-overview-copy">
          <span className="consents-overview-icon">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <span className="consents-overview-eyebrow">
              Biblioteca privada
            </span>
            <h2>Consentimientos listos para tu agenda</h2>
            <p>
              Cada reemplazo crea una versión y conserva las asignaciones
              históricas.
            </p>
          </div>
        </div>
        <div className="consents-overview-stats">
          <div>
            <strong>{templates.data?.length ?? 0}</strong>
            <span>Documentos</span>
          </div>
          <div>
            <strong>{attached}</strong>
            <span>Con archivo</span>
          </div>
          <div>
            <strong>{active}</strong>
            <span>Activos</span>
          </div>
        </div>
      </div>
      <QueryBoundary
        empty={!templates.data?.length}
        emptyDescription="Sube la primera versión de un consentimiento privado."
        emptyTitle="Todavía no hay consentimientos"
        error={templates.error ?? catalog.error}
        loading={templates.loading || catalog.loading}
        onRetry={() => {
          void templates.reload();
          void catalog.reload();
        }}
      >
        <Card className="admin-card consents-table-card">
          <CardContent className="p-4 sm:p-5">
            <div className="consents-table-heading">
              <div>
                <h2>Documentos guardados</h2>
                <p>Ninguna ruta de storage aparece en esta tabla.</p>
              </div>
              <span>{templates.data?.length ?? 0} registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-[#e7ddd4] text-xs text-slate-400">
                  <tr>
                    <th className="px-3 py-3">Consentimiento</th>
                    <th className="px-3 py-3">Archivo</th>
                    <th className="px-3 py-3">Versión</th>
                    <th className="px-3 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.data?.map((template) => (
                    <tr
                      className="border-b border-[#eee7e1] last:border-0"
                      key={template.id}
                    >
                      <td className="px-3 py-4">
                        <div className="consent-table-name">
                          <span className="consent-table-icon">
                            <FileText className="h-4 w-4" />
                          </span>
                          <div>
                            <p>{template.name}</p>
                            <span>
                              {template.active ? "Publicado" : "Inactivo"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="consent-table-file">
                          <FileText className="h-4 w-4" />
                          <span>
                            {template.document?.fileName ?? "Sin archivo"}
                          </span>
                          {template.document ? (
                            <small>
                              {formatSchedulerFileSize(
                                template.document.sizeBytes,
                              )}
                            </small>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-4 tabular-nums">
                        v{template.currentVersion}
                      </td>
                      <td className="px-3 py-4">
                        <div className="consent-table-actions">
                          {template.document ? (
                            <PrivateDocumentButton
                              id={template.document.id}
                              kind="consent"
                              label="Abrir"
                            />
                          ) : null}
                          {canAdmin ? (
                            <Button
                              onClick={() => openEditor(template)}
                              size="sm"
                              variant="outline"
                            >
                              <Upload className="mr-2 h-4 w-4" /> Nueva versión
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </QueryBoundary>
      <AdministrationCoverageNotice title="Privacidad por diseño">
        Las URLs duran 300 segundos y cada apertura exige una autorización de un
        solo uso. La interfaz no conserva la URL al cerrar la acción.
      </AdministrationCoverageNotice>
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="admin-dialog consent-dialog max-w-2xl overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? `Nueva versión de ${editing.name}`
                : "Nuevo consentimiento"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "El archivo anterior permanece ligado a su versión histórica."
                : "El documento se guardará en el bucket privado."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <Label htmlFor="consent-commerce">Comercio</Label>
              <Select
                disabled={Boolean(editing)}
                onValueChange={setCommerceId}
                value={commerceId}
              >
                <SelectTrigger
                  className={`${controlClass} mt-1.5`}
                  id="consent-commerce"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {commerceOptions(catalog.data).map((commerce) => (
                    <SelectItem key={commerce.id} value={commerce.id}>
                      {commerce.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="consent-name">Nombre</Label>
              <Input
                className={`${controlClass} mt-1.5`}
                id="consent-name"
                maxLength={160}
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </div>
            <ConsentDropzone file={file} onFile={setFile} />
          </div>
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button onClick={() => setEditorOpen(false)} variant="outline">
              Cancelar
            </Button>
            <Button
              className="admin-primary"
              disabled={
                !file || !commerceId || name.trim().length < 2 || saving
              }
              onClick={() => void save()}
            >
              {saving ? "Cargando…" : editing ? "Crear versión" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {catalog.data ? (
        <ConsentRecordsDialog
          canWrite={canWrite}
          catalog={catalog.data}
          onOpenChange={setRecordsOpen}
          open={recordsOpen}
          templates={templates.data ?? []}
        />
      ) : null}
    </RestoredAdministrationFrame>
  );
}
