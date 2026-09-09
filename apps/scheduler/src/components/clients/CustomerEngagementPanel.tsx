"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import type {
  SchedulerDocumentDto,
  SchedulerMedicalRecordDto,
} from "@cosmetics/types";
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
  Textarea,
  toast,
} from "@cosmetics/ui";
import {
  Download,
  HeartPulse,
  LockKeyhole,
  Plus,
  Save,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { schedulerApi, schedulerApiErrorMessage } from "@/lib/api";
import { authorizationRetentionMs } from "@/lib/scheduler-customer-data";
import { formatSchedulerFileSize } from "@/lib/scheduler-engagement-presentation";
import { useSchedulerSession } from "@/lib/session";

const controlClass =
  "client-modal-control h-11 rounded-xl border-[#dfd5cc] bg-white focus-visible:ring-[#c3a583]";

type MedicalFieldDraft = { key: string; value: string };
type CustomerDocumentKind = NonNullable<SchedulerDocumentDto["kind"]>;

function fieldDraft(record: SchedulerMedicalRecordDto): MedicalFieldDraft[] {
  return Object.entries(record.fields).map(([key, value]) => ({
    key,
    value: typeof value === "string" ? value : JSON.stringify(value),
  }));
}

function parseFieldValue(value: string): unknown {
  const normalized = value.trim();
  if (!normalized) return "";
  try {
    return JSON.parse(normalized) as unknown;
  } catch {
    return value;
  }
}

function permission(
  bootstrap: ReturnType<typeof useSchedulerSession>["bootstrap"],
  capability: "READ" | "WRITE",
): boolean {
  return Boolean(
    bootstrap?.permissions.some(
      (item) =>
        item.screenKey === "scheduler/settings/records" &&
        item.capabilities.includes(capability),
    ),
  );
}

function MedicalDocumentButton({
  document,
}: {
  document: SchedulerDocumentDto;
}) {
  const { bootstrap } = useSchedulerSession();
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    const privateWindow = window.open("about:blank", "_blank");
    if (privateWindow) privateWindow.opener = null;
    setLoading(true);
    setError(null);
    try {
      const authorization = await schedulerApi.createAuthorization({
        secret,
        purpose: "MEDICAL_DOCUMENT_DOWNLOAD",
        screenKey: "scheduler/settings/records",
        targetType: "customer",
        targetId: document.id,
      });
      const temporary = await schedulerApi.privateDocumentUrl(
        "customer",
        document.id,
        authorization.token,
      );
      if (privateWindow) privateWindow.location.replace(temporary.url);
      else window.open(temporary.url, "_blank", "noopener,noreferrer");
      setOpen(false);
      toast.success("Documento abierto con acceso temporal.");
    } catch (cause) {
      privateWindow?.close();
      setError(schedulerApiErrorMessage(cause));
    } finally {
      setSecret("");
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        aria-label={`Abrir ${document.fileName}`}
        onClick={() => setOpen(true)}
        size="icon"
        variant="outline"
      >
        <Download className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md overflow-x-hidden rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Abrir documento privado</DialogTitle>
            <DialogDescription>
              La URL expira en cinco minutos y no se conserva en la ficha.
            </DialogDescription>
          </DialogHeader>
          <Label htmlFor={`medical-document-secret-${document.id}`}>
            Código personal
          </Label>
          <Input
            autoComplete="one-time-code"
            className={`${controlClass} tracking-[0.2em]`}
            id={`medical-document-secret-${document.id}`}
            inputMode="numeric"
            onChange={(event) =>
              setSecret(event.target.value.replace(/\D/g, ""))
            }
            type="password"
            value={secret}
          />
          {!bootstrap?.secondaryAuthorizationConfigured ? (
            <p className="text-xs text-amber-700">
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
              onClick={() => void download()}
            >
              {loading ? "Autorizando…" : "Abrir ahora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CustomerEngagementPanel({
  branchId,
  customerId,
}: {
  branchId: string;
  customerId: string;
}) {
  const { bootstrap } = useSchedulerSession();
  const canRead = permission(bootstrap, "READ");
  const canWrite = permission(bootstrap, "WRITE");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<SchedulerMedicalRecordDto | null>(null);
  const [documents, setDocuments] = useState<SchedulerDocumentDto[] | null>(
    null,
  );
  const [fields, setFields] = useState<MedicalFieldDraft[]>([]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editSecret, setEditSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadKind, setUploadKind] =
    useState<CustomerDocumentKind>("MEDICAL_SUPPORT");
  const [commerceId, setCommerceId] = useState("");

  useEffect(() => {
    if (!canRead) {
      setCommerceId("");
      return;
    }
    let active = true;
    void schedulerApi
      .operationalCatalog()
      .then((data) => {
        if (!active) return;
        setCommerceId(
          data.branches.find((branch) => branch.branchId === branchId)
            ?.commerceId ?? "",
        );
      })
      .catch(() => {
        if (active) setCommerceId("");
      });
    return () => {
      active = false;
    };
  }, [branchId, canRead]);

  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setTimeout(() => {
      setRecord(null);
      setDocuments(null);
      setFields([]);
      setExpiresAt(null);
    }, authorizationRetentionMs(expiresAt));
    return () => window.clearTimeout(timer);
  }, [expiresAt]);

  async function unlock() {
    if (!secret || !commerceId) return;
    setLoading(true);
    setError(null);
    try {
      const [medicalAuthorization, documentAuthorization] = await Promise.all([
        schedulerApi.createAuthorization({
          secret,
          purpose: "MEDICAL_RECORD_VIEW",
          screenKey: "scheduler/settings/records",
          targetType: "SchedulerMedicalRecord",
          targetId: customerId,
        }),
        schedulerApi.createAuthorization({
          secret,
          purpose: "MEDICAL_RECORD_VIEW",
          screenKey: "scheduler/settings/records",
          targetType: "SchedulerCustomerDocuments",
          targetId: customerId,
        }),
      ]);
      const [nextRecord, nextDocuments] = await Promise.all([
        schedulerApi.medicalRecord(
          customerId,
          commerceId,
          medicalAuthorization.token,
        ),
        schedulerApi.customerDocuments(
          customerId,
          branchId,
          documentAuthorization.token,
        ),
      ]);
      setRecord(nextRecord);
      setDocuments(nextDocuments);
      setFields(fieldDraft(nextRecord));
      setExpiresAt(
        medicalAuthorization.expiresAt < documentAuthorization.expiresAt
          ? medicalAuthorization.expiresAt
          : documentAuthorization.expiresAt,
      );
    } catch (cause) {
      const message = schedulerApiErrorMessage(cause);
      setError(message);
      toast.error(message);
    } finally {
      setSecret("");
      setLoading(false);
    }
  }

  async function saveRecord() {
    if (!record || !editSecret) return;
    const duplicate = fields.some(
      (field, index) =>
        field.key.trim() &&
        fields.findIndex(
          (candidate) => candidate.key.trim() === field.key.trim(),
        ) !== index,
    );
    if (duplicate || fields.some((field) => !field.key.trim())) {
      toast.error("Cada campo médico necesita una clave única.");
      return;
    }
    setSaving(true);
    try {
      const authorization = await schedulerApi.createAuthorization({
        secret: editSecret,
        purpose: "MEDICAL_RECORD_EDIT",
        screenKey: "scheduler/settings/records",
        targetType: "SchedulerMedicalRecord",
        targetId: customerId,
      });
      const result = await schedulerApi.updateMedicalRecord(customerId, {
        commerceId,
        fields: Object.fromEntries(
          fields.map((field) => [
            field.key.trim(),
            parseFieldValue(field.value),
          ]),
        ),
        ...(record.version ? { expectedVersion: record.version } : {}),
        authorizationToken: authorization.token,
      });
      const next = {
        ...record,
        fields: Object.fromEntries(
          fields.map((field) => [
            field.key.trim(),
            parseFieldValue(field.value),
          ]),
        ),
        version: result.version,
        updatedAt: result.updatedAt,
      };
      setRecord(next);
      setFields(fieldDraft(next));
      setEditOpen(false);
      toast.success("Expediente médico actualizado.");
    } catch (cause) {
      const message = schedulerApiErrorMessage(cause);
      setError(message);
      toast.error(message);
    } finally {
      setEditSecret("");
      setSaving(false);
    }
  }

  async function uploadDocument() {
    if (!uploadFile || !uploadKind) return;
    if (uploadFile.size > 5 * 1024 * 1024) {
      toast.error("El archivo no puede superar 5 MB.");
      return;
    }
    const form = new FormData();
    form.set("branchId", branchId);
    form.set("kind", uploadKind);
    form.set("file", uploadFile);
    setUploading(true);
    try {
      await schedulerApi.uploadCustomerDocument(customerId, form);
      setUploadFile(null);
      setDocuments(null);
      setRecord(null);
      setExpiresAt(null);
      toast.success(
        "Documento guardado. Autoriza de nuevo la ficha para consultar los metadatos.",
      );
    } catch (cause) {
      const message = schedulerApiErrorMessage(cause);
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  if (!canRead && !canWrite) return null;

  return (
    <section className="client-modal-section">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-[#ad8b67]" />
          <h3 className="font-semibold">Expediente médico y documentos</h3>
        </div>
        <Badge variant="outline">
          <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Cifrado y auditado
        </Badge>
      </div>
      {!record || !documents ? (
        <div className="rounded-2xl border border-dashed border-[#d9c9bb] bg-[#fcfaf8] p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5ede4] text-[#ad8b67]">
              <LockKeyhole className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold">Autorizar datos médicos</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Se emiten autorizaciones independientes para el expediente y los
                metadatos de documentos. El acceso visible expira.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input
              autoComplete="one-time-code"
              className={`${controlClass} tracking-[0.2em]`}
              disabled={!bootstrap?.secondaryAuthorizationConfigured || loading}
              inputMode="numeric"
              onChange={(event) =>
                setSecret(event.target.value.replace(/\D/g, ""))
              }
              placeholder="Código personal"
              type="password"
              value={secret}
            />
            <Button
              disabled={
                !secret ||
                !commerceId ||
                loading ||
                !bootstrap?.secondaryAuthorizationConfigured
              }
              onClick={() => void unlock()}
            >
              {loading ? "Autorizando…" : "Autorizar"}
            </Button>
          </div>
          {error ? (
            <p className="mt-2 text-sm text-rose-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#eee6df] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">Ficha médica</p>
                <p className="mt-1 text-xs text-slate-500">
                  v{record.version} · {Object.keys(record.fields).length} campos
                </p>
              </div>
              {canWrite ? (
                <Button
                  onClick={() => setEditOpen(true)}
                  size="sm"
                  variant="outline"
                >
                  Editar ficha
                </Button>
              ) : null}
            </div>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {Object.entries(record.fields).map(([key, value]) => (
                <div className="rounded-xl bg-[#faf8f5] p-3" key={key}>
                  <dt className="text-xs text-slate-400">{key}</dt>
                  <dd className="mt-1 break-words text-sm">
                    {typeof value === "string" ? value : JSON.stringify(value)}
                  </dd>
                </div>
              ))}
            </dl>
            {!Object.keys(record.fields).length ? (
              <p className="mt-3 text-sm text-slate-500">
                Sin campos médicos registrados.
              </p>
            ) : null}
          </div>
          <div className="rounded-2xl border border-[#eee6df] bg-white p-4">
            <p className="font-semibold">Documentos privados</p>
            <div className="mt-3 space-y-2">
              {documents.map((document) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl bg-[#faf8f5] p-3"
                  key={document.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {document.fileName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {document.kind} ·{" "}
                      {formatSchedulerFileSize(document.sizeBytes)}
                    </p>
                  </div>
                  <MedicalDocumentButton document={document} />
                </div>
              ))}
              {!documents.length ? (
                <p className="text-sm text-slate-500">Sin documentos.</p>
              ) : null}
            </div>
          </div>
        </div>
      )}
      {canWrite ? (
        <div className="mt-4 rounded-2xl border border-[#eee6df] bg-white p-4">
          <p className="font-semibold">Adjuntar soporte</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
            <div>
              <Label htmlFor="medical-document-kind">Tipo</Label>
              <Select
                onValueChange={(value) =>
                  setUploadKind(value as CustomerDocumentKind)
                }
                value={uploadKind}
              >
                <SelectTrigger
                  className={controlClass}
                  id="medical-document-kind"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEDICAL_SUPPORT">
                    Soporte médico
                  </SelectItem>
                  <SelectItem value="CONSENT_SUPPORT">
                    Consentimiento
                  </SelectItem>
                  <SelectItem value="OTHER">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="medical-document-file">Archivo</Label>
              <Input
                accept="application/pdf,.doc,.docx,image/jpeg,image/png"
                className={controlClass}
                id="medical-document-file"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setUploadFile(event.target.files?.[0] ?? null)
                }
                type="file"
              />
            </div>
            <Button
              disabled={!uploadFile || uploading}
              onClick={() => void uploadDocument()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Cargando…" : "Adjuntar"}
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto overflow-x-hidden rounded-[26px]">
          <DialogHeader>
            <DialogTitle>Editar ficha médica</DialogTitle>
            <DialogDescription>
              Los valores conservan JSON válido; cualquier otro texto se guarda
              como cadena. La escritura usa control de versión.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                className="grid gap-2 rounded-xl border border-[#eee6df] p-3 sm:grid-cols-[12rem_1fr_auto]"
                key={index}
              >
                <Input
                  aria-label={`Clave del campo ${index + 1}`}
                  className={controlClass}
                  onChange={(event) =>
                    setFields((current) =>
                      current.map((item, position) =>
                        position === index
                          ? { ...item, key: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="Clave"
                  value={field.key}
                />
                <Textarea
                  aria-label={`Valor del campo ${index + 1}`}
                  className="client-modal-control min-h-11"
                  onChange={(event) =>
                    setFields((current) =>
                      current.map((item, position) =>
                        position === index
                          ? { ...item, value: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="Valor"
                  value={field.value}
                />
                <Button
                  aria-label={`Quitar campo ${index + 1}`}
                  onClick={() =>
                    setFields((current) =>
                      current.filter((_item, position) => position !== index),
                    )
                  }
                  size="icon"
                  variant="outline"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              onClick={() =>
                setFields((current) => [...current, { key: "", value: "" }])
              }
              size="sm"
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" /> Agregar campo
            </Button>
            <div>
              <Label htmlFor="medical-edit-secret">Código personal</Label>
              <Input
                autoComplete="one-time-code"
                className={`${controlClass} mt-1.5 tracking-[0.2em]`}
                id="medical-edit-secret"
                inputMode="numeric"
                onChange={(event) =>
                  setEditSecret(event.target.value.replace(/\D/g, ""))
                }
                type="password"
                value={editSecret}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button onClick={() => setEditOpen(false)} variant="outline">
              Cancelar
            </Button>
            <Button
              disabled={!editSecret || saving}
              onClick={() => void saveRecord()}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando…" : "Guardar ficha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
