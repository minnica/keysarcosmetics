"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import type {
  SchedulerAestheticEligibleAppointmentDto,
  SchedulerAestheticRecordTemplateDto,
  SchedulerAestheticVisitPhotoDto,
  SchedulerAestheticVisitRecordDto,
  SchedulerAestheticWorkspaceDto,
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
  Camera,
  Check,
  Download,
  FileSignature,
  GitCompareArrows,
  LockKeyhole,
  Pencil,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { schedulerApi, schedulerApiErrorMessage } from "@/lib/api";
import { authorizationRetentionMs } from "@/lib/scheduler-customer-data";
import { downloadAestheticRecordPdf } from "@/lib/scheduler-aesthetic-record-pdf";

const controlClass =
  "client-modal-control h-11 rounded-xl border-[#dfd5cc] bg-white focus-visible:ring-[#c3a583]";

type PhotoDraft = Pick<
  SchedulerAestheticVisitPhotoDto,
  "kind" | "area" | "fileName" | "mimeType" | "sizeBytes"
>;

type EditorState = {
  recordId: string | null;
  appointmentId: string;
  templateId: string;
  fieldValues: Record<string, string | number | boolean | null>;
  products: string;
  techniques: string;
  recommendations: string;
  photos: PhotoDraft[];
  expectedVersion?: number;
};

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function valueLabel(value: string | number | boolean | null): string {
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return value === null || value === "" ? "Sin registro" : String(value);
}

function listValue(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function emptyEditor(
  appointment: SchedulerAestheticEligibleAppointmentDto,
  template: SchedulerAestheticRecordTemplateDto,
): EditorState {
  return {
    recordId: null,
    appointmentId: appointment.id,
    templateId: template.id,
    fieldValues: Object.fromEntries(
      template.categories.flatMap((category) =>
        category.fields.map((field) => [
          field.key,
          field.type === "BOOLEAN" ? false : "",
        ]),
      ),
    ),
    products: "",
    techniques: "",
    recommendations: "",
    photos: [],
  };
}

function recordEditor(record: SchedulerAestheticVisitRecordDto): EditorState {
  return {
    recordId: record.id,
    appointmentId: record.appointmentId,
    templateId: record.templateId,
    fieldValues: Object.fromEntries(
      record.categories.flatMap((category) =>
        category.fields.map((field) => [field.key, field.value]),
      ),
    ),
    products: record.products.join(", "),
    techniques: record.techniques.join(", "),
    recommendations: record.recommendations,
    photos: record.photos.map((photo) => ({
      kind: photo.kind,
      area: photo.area,
      fileName: photo.fileName,
      mimeType: photo.mimeType,
      sizeBytes: photo.sizeBytes,
    })),
    expectedVersion: record.version,
  };
}

function ComparisonColumn({
  record,
}: {
  record: SchedulerAestheticVisitRecordDto;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#e8ddd3] bg-white p-4">
      <p className="font-semibold">{dateLabel(record.appointmentAt)}</p>
      <p className="mt-1 text-xs text-slate-500">
        {record.serviceName} · {record.specialistName}
      </p>
      <div className="mt-3 space-y-3">
        {record.categories.map((category) => (
          <div key={category.id}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#ad8b67]">
              {category.name}
            </p>
            {category.fields.map((field) => (
              <div
                className="mt-1 flex justify-between gap-3 text-sm"
                key={field.key}
              >
                <span className="text-slate-500">{field.label}</span>
                <span className="text-right font-medium">
                  {valueLabel(field.value)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CustomerAestheticVisitPanel({
  branchId,
  commerceId,
  customerId,
  customerName,
  canWrite,
}: {
  branchId: string;
  commerceId: string;
  customerId: string;
  customerName: string;
  canWrite: boolean;
}) {
  const [workspace, setWorkspace] =
    useState<SchedulerAestheticWorkspaceDto | null>(null);
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editSecret, setEditSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [signRecord, setSignRecord] =
    useState<SchedulerAestheticVisitRecordDto | null>(null);
  const [signCode, setSignCode] = useState("");
  const [signing, setSigning] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>(
    [],
  );
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => {
    setWorkspace(null);
    setExpiresAt(null);
    setSelectedForComparison([]);
  }, [branchId, customerId]);

  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setTimeout(() => {
      setWorkspace(null);
      setExpiresAt(null);
      setSelectedForComparison([]);
    }, authorizationRetentionMs(expiresAt));
    return () => window.clearTimeout(timer);
  }, [expiresAt]);

  const selectedRecords = useMemo(
    () =>
      selectedForComparison
        .map((id) => workspace?.records.find((record) => record.id === id))
        .filter((record): record is SchedulerAestheticVisitRecordDto =>
          Boolean(record),
        ),
    [selectedForComparison, workspace],
  );

  const editorTemplate = useMemo(
    () =>
      workspace?.templates.find(
        (template) => template.id === editor?.templateId,
      ) ?? null,
    [editor, workspace],
  );

  async function unlock() {
    if (!secret || !commerceId) return;
    setLoading(true);
    setError(null);
    try {
      const authorization = await schedulerApi.createAuthorization({
        secret,
        purpose: "AESTHETIC_RECORD_VIEW",
        screenKey: "scheduler/settings/records",
        targetType: "SchedulerAestheticVisitRecord",
        targetId: customerId,
      });
      const next = await schedulerApi.aestheticWorkspace(customerId, {
        branchId,
        commerceId,
        authorizationToken: authorization.token,
      });
      setWorkspace(next);
      setExpiresAt(authorization.expiresAt);
    } catch (cause) {
      const message = schedulerApiErrorMessage(cause);
      setError(message);
      toast.error(message);
    } finally {
      setSecret("");
      setLoading(false);
    }
  }

  function startNew() {
    const appointment = workspace?.eligibleAppointments[0];
    if (!appointment) return;
    const template = workspace?.templates.find(
      (candidate) => candidate.id === appointment.templateId,
    );
    if (!template) return;
    setEditor(emptyEditor(appointment, template));
  }

  function chooseAppointment(appointmentId: string) {
    const appointment = workspace?.eligibleAppointments.find(
      (candidate) => candidate.id === appointmentId,
    );
    const template = workspace?.templates.find(
      (candidate) => candidate.id === appointment?.templateId,
    );
    if (appointment && template) setEditor(emptyEditor(appointment, template));
  }

  function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    if (!files.length || !editor) return;
    const invalid = files.find(
      (file) =>
        !["image/jpeg", "image/png"].includes(file.type) ||
        file.size > 5 * 1024 * 1024,
    );
    if (invalid) {
      toast.error("Cada fotografía debe ser JPG o PNG y pesar máximo 5 MB.");
      event.target.value = "";
      return;
    }
    if (editor.photos.length + files.length > 6) {
      toast.error("Puedes adjuntar hasta seis fotografías por visita.");
      event.target.value = "";
      return;
    }
    setEditor({
      ...editor,
      photos: [
        ...editor.photos,
        ...files.map((file, index) => ({
          kind:
            (editor.photos.length + index) % 2 === 0
              ? ("BEFORE" as const)
              : ("AFTER" as const),
          area: "Área tratada",
          fileName: file.name,
          mimeType: file.type as PhotoDraft["mimeType"],
          sizeBytes: file.size,
        })),
      ],
    });
    event.target.value = "";
  }

  async function save() {
    if (!editor || !editSecret) return;
    setSaving(true);
    try {
      const authorization = await schedulerApi.createAuthorization({
        secret: editSecret,
        purpose: "AESTHETIC_RECORD_EDIT",
        screenKey: "scheduler/settings/records",
        targetType: "SchedulerAestheticVisitRecord",
        targetId: customerId,
      });
      const result = await schedulerApi.saveAestheticVisitRecord(
        customerId,
        editor.recordId,
        {
          appointmentId: editor.appointmentId,
          templateId: editor.templateId,
          fieldValues: editor.fieldValues,
          products: listValue(editor.products),
          techniques: listValue(editor.techniques),
          recommendations: editor.recommendations,
          photos: editor.photos,
          ...(editor.expectedVersion
            ? { expectedVersion: editor.expectedVersion }
            : {}),
          authorizationToken: authorization.token,
        },
      );
      setWorkspace((current) =>
        current
          ? {
              ...current,
              records: [
                result,
                ...current.records.filter((record) => record.id !== result.id),
              ],
              eligibleAppointments: current.eligibleAppointments.filter(
                (appointment) => appointment.id !== result.appointmentId,
              ),
            }
          : current,
      );
      setEditor(null);
      toast.success("Registro estético guardado como borrador.");
    } catch (cause) {
      toast.error(schedulerApiErrorMessage(cause));
    } finally {
      setEditSecret("");
      setSaving(false);
    }
  }

  async function sign() {
    if (!signRecord || !signCode) return;
    setSigning(true);
    try {
      const signed = await schedulerApi.signAestheticVisitRecord(
        customerId,
        signRecord.id,
        { personalCode: signCode, expectedVersion: signRecord.version },
      );
      setWorkspace((current) =>
        current
          ? {
              ...current,
              records: current.records.map((record) =>
                record.id === signed.id ? signed : record,
              ),
            }
          : current,
      );
      setSignRecord(null);
      toast.success("Registro firmado y bloqueado para edición.");
    } catch (cause) {
      toast.error(schedulerApiErrorMessage(cause));
    } finally {
      setSignCode("");
      setSigning(false);
    }
  }

  function toggleComparison(id: string) {
    setSelectedForComparison((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 2) {
        toast.info("Selecciona sólo dos visitas para comparar.");
        return current;
      }
      return [...current, id];
    });
  }

  async function exportPdf(record: SchedulerAestheticVisitRecordDto) {
    setExportingId(record.id);
    try {
      await downloadAestheticRecordPdf(record, customerName);
      toast.success("Expediente PDF descargado.");
    } catch {
      toast.error("No se pudo generar el PDF del expediente.");
    } finally {
      setExportingId(null);
    }
  }

  return (
    <div className="mt-6 border-t border-[#eee6df] pt-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-[#ad8b67]" />
            <h3 className="font-semibold">Expediente estético por visita</h3>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Evolución, protocolo, productos, evidencia y firma vinculados a cada
            cita atendida.
          </p>
        </div>
        <Badge variant="outline">
          <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Sensible e inmutable al
          firmar
        </Badge>
      </div>

      {!workspace ? (
        <div className="rounded-2xl border border-dashed border-[#d9c9bb] bg-[#fcfaf8] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5ede4] text-[#ad8b67]">
              <LockKeyhole className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold">Autorizar expediente estético</p>
              <p className="mt-1 text-xs text-slate-500">
                La consulta se registra y el acceso visible expira
                automáticamente.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input
              autoComplete="one-time-code"
              className={`${controlClass} tracking-[0.2em]`}
              inputMode="numeric"
              onChange={(event) =>
                setSecret(event.target.value.replace(/\D/g, ""))
              }
              placeholder="Código personal"
              type="password"
              value={secret}
            />
            <Button
              disabled={!secret || !commerceId || loading}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500">
              {workspace.records.length} visitas documentadas ·{" "}
              {workspace.eligibleAppointments.length} pendientes
            </p>
            {canWrite ? (
              <Button
                disabled={!workspace.eligibleAppointments.length}
                onClick={startNew}
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva visita
              </Button>
            ) : null}
          </div>
          {selectedRecords.length === 2 ? (
            <div className="rounded-[22px] border border-[#d8c4b1] bg-[#faf7f3] p-4">
              <div className="mb-3 flex items-center gap-2">
                <GitCompareArrows className="h-4 w-4 text-[#ad8b67]" />
                <p className="font-semibold">Comparación de evolución</p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {selectedRecords.map((record) => (
                  <ComparisonColumn key={record.id} record={record} />
                ))}
              </div>
            </div>
          ) : null}
          <div className="grid gap-3 xl:grid-cols-2">
            {workspace.records.map((record) => (
              <article
                className="rounded-[22px] border border-[#e8ddd3] bg-white p-4 shadow-sm"
                key={record.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{record.serviceName}</p>
                      <Badge
                        className={
                          record.status === "SIGNED"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }
                        variant="outline"
                      >
                        {record.status === "SIGNED" ? "Firmado" : "Borrador"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {dateLabel(record.appointmentAt)} · {record.branchName}
                    </p>
                    <p className="mt-1 text-sm">
                      Especialista:{" "}
                      <span className="font-medium">
                        {record.specialistName}
                      </span>
                    </p>
                  </div>
                  <button
                    aria-label={`Comparar visita del ${dateLabel(record.appointmentAt)}`}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${selectedForComparison.includes(record.id) ? "border-[#2a3a4b] bg-[#2a3a4b] text-white" : "border-[#dfd5cc] text-slate-500"}`}
                    onClick={() => toggleComparison(record.id)}
                    type="button"
                  >
                    {selectedForComparison.includes(record.id) ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <GitCompareArrows className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl bg-[#faf8f5] p-3">
                    <p className="text-xs text-slate-400">Plantilla</p>
                    <p className="mt-1 text-sm font-medium">
                      v{record.templateVersion}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#faf8f5] p-3">
                    <p className="text-xs text-slate-400">Fotografías</p>
                    <p className="mt-1 text-sm font-medium">
                      {record.photos.length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#faf8f5] p-3">
                    <p className="text-xs text-slate-400">Productos</p>
                    <p className="mt-1 truncate text-sm font-medium">
                      {record.products.length || "—"}
                    </p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                  {record.recommendations || "Sin recomendaciones registradas."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    disabled={exportingId === record.id}
                    onClick={() => void exportPdf(record)}
                    size="sm"
                    variant="outline"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {exportingId === record.id ? "Generando…" : "PDF"}
                  </Button>
                  {canWrite && record.status === "DRAFT" ? (
                    <>
                      <Button
                        onClick={() => setEditor(recordEditor(record))}
                        size="sm"
                        variant="outline"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button onClick={() => setSignRecord(record)} size="sm">
                        <FileSignature className="mr-2 h-4 w-4" />
                        Firmar
                      </Button>
                    </>
                  ) : null}
                </div>
                {record.status === "SIGNED" ? (
                  <p className="mt-3 text-xs text-emerald-700">
                    Firmado por {record.signedBy} ·{" "}
                    {dateLabel(record.signedAt!)}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
          {!workspace.records.length ? (
            <p className="rounded-2xl border border-dashed p-5 text-center text-sm text-slate-500">
              Aún no hay visitas estéticas documentadas.
            </p>
          ) : null}
        </div>
      )}

      <Dialog
        open={Boolean(editor)}
        onOpenChange={(open) => !open && setEditor(null)}
      >
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto overflow-x-hidden rounded-[26px]">
          <DialogHeader>
            <DialogTitle>
              {editor?.recordId
                ? "Editar visita estética"
                : "Nueva visita estética"}
            </DialogTitle>
            <DialogDescription>
              La plantilla se determina por el servicio atendido. Guarda el
              borrador antes de solicitar la firma de la especialista.
            </DialogDescription>
          </DialogHeader>
          {editor ? (
            <div className="space-y-5">
              {!editor.recordId ? (
                <div>
                  <Label htmlFor="aesthetic-appointment">Cita atendida</Label>
                  <Select
                    onValueChange={chooseAppointment}
                    value={editor.appointmentId}
                  >
                    <SelectTrigger
                      className={`${controlClass} mt-1.5`}
                      id="aesthetic-appointment"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {workspace?.eligibleAppointments.map((appointment) => (
                        <SelectItem key={appointment.id} value={appointment.id}>
                          {dateLabel(appointment.startsAt)} ·{" "}
                          {appointment.serviceName} ·{" "}
                          {appointment.specialistName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {editorTemplate?.categories.map((category) => (
                <fieldset
                  className="rounded-2xl border border-[#e8ddd3] p-4"
                  key={category.id}
                >
                  <legend className="px-2 text-sm font-semibold text-[#8f6f50]">
                    {category.name}
                  </legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {category.fields.map((field) => (
                      <div
                        className={field.type === "TEXT" ? "sm:col-span-2" : ""}
                        key={field.key}
                      >
                        <Label htmlFor={`aesthetic-${field.key}`}>
                          {field.label}
                          {field.required ? " *" : ""}
                        </Label>
                        {field.type === "SELECT" ? (
                          <Select
                            onValueChange={(value) =>
                              setEditor({
                                ...editor,
                                fieldValues: {
                                  ...editor.fieldValues,
                                  [field.key]: value,
                                },
                              })
                            }
                            value={String(editor.fieldValues[field.key] ?? "")}
                          >
                            <SelectTrigger
                              className={`${controlClass} mt-1.5`}
                              id={`aesthetic-${field.key}`}
                            >
                              <SelectValue placeholder="Selecciona" />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.type === "BOOLEAN" ? (
                          <label className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-[#dfd5cc] px-3 text-sm">
                            <input
                              checked={Boolean(editor.fieldValues[field.key])}
                              onChange={(event) =>
                                setEditor({
                                  ...editor,
                                  fieldValues: {
                                    ...editor.fieldValues,
                                    [field.key]: event.target.checked,
                                  },
                                })
                              }
                              type="checkbox"
                            />
                            Sí
                          </label>
                        ) : (
                          <Input
                            autoComplete="off"
                            className={`${controlClass} mt-1.5`}
                            id={`aesthetic-${field.key}`}
                            name={`aesthetic-visit-${field.key}`}
                            onChange={(event) =>
                              setEditor({
                                ...editor,
                                fieldValues: {
                                  ...editor.fieldValues,
                                  [field.key]: event.target.value,
                                },
                              })
                            }
                            type={field.type === "NUMBER" ? "number" : "text"}
                            value={String(editor.fieldValues[field.key] ?? "")}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </fieldset>
              ))}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="aesthetic-products">
                    Productos aplicados
                  </Label>
                  <Textarea
                    className="client-modal-control mt-1.5 min-h-24"
                    id="aesthetic-products"
                    onChange={(event) =>
                      setEditor({ ...editor, products: event.target.value })
                    }
                    placeholder="Uno por línea o separados por coma"
                    value={editor.products}
                  />
                </div>
                <div>
                  <Label htmlFor="aesthetic-techniques">
                    Técnicas realizadas
                  </Label>
                  <Textarea
                    className="client-modal-control mt-1.5 min-h-24"
                    id="aesthetic-techniques"
                    onChange={(event) =>
                      setEditor({ ...editor, techniques: event.target.value })
                    }
                    placeholder="Una por línea o separadas por coma"
                    value={editor.techniques}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="aesthetic-recommendations">
                  Recomendaciones
                </Label>
                <Textarea
                  className="client-modal-control mt-1.5 min-h-24"
                  id="aesthetic-recommendations"
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      recommendations: event.target.value,
                    })
                  }
                  value={editor.recommendations}
                />
              </div>
              <div className="rounded-2xl border border-[#e8ddd3] p-4">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-[#ad8b67]" />
                  <p className="font-semibold">Evidencia fotográfica</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  JPG o PNG · máximo 5 MB por archivo · hasta 6 fotografías.
                </p>
                <Input
                  accept="image/jpeg,image/png"
                  className={`${controlClass} mt-3`}
                  multiple
                  onChange={addPhotos}
                  type="file"
                />
                <div className="mt-3 space-y-2">
                  {editor.photos.map((photo, index) => (
                    <div
                      className="grid gap-2 rounded-xl bg-[#faf8f5] p-3 sm:grid-cols-[1fr_9rem_1fr_auto]"
                      key={`${photo.fileName}-${index}`}
                    >
                      <p className="min-w-0 truncate self-center text-sm">
                        {photo.fileName}
                      </p>
                      <Select
                        onValueChange={(value) =>
                          setEditor({
                            ...editor,
                            photos: editor.photos.map((item, position) =>
                              position === index
                                ? { ...item, kind: value as PhotoDraft["kind"] }
                                : item,
                            ),
                          })
                        }
                        value={photo.kind}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BEFORE">Antes</SelectItem>
                          <SelectItem value="AFTER">Después</SelectItem>
                          <SelectItem value="DETAIL">Detalle</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        aria-label={`Área de fotografía ${index + 1}`}
                        className="h-9"
                        onChange={(event) =>
                          setEditor({
                            ...editor,
                            photos: editor.photos.map((item, position) =>
                              position === index
                                ? { ...item, area: event.target.value }
                                : item,
                            ),
                          })
                        }
                        value={photo.area}
                      />
                      <Button
                        aria-label={`Quitar fotografía ${index + 1}`}
                        onClick={() =>
                          setEditor({
                            ...editor,
                            photos: editor.photos.filter(
                              (_item, position) => position !== index,
                            ),
                          })
                        }
                        size="sm"
                        variant="outline"
                      >
                        Quitar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="aesthetic-edit-secret">
                  Código personal para guardar
                </Label>
                <Input
                  autoComplete="one-time-code"
                  className={`${controlClass} mt-1.5 tracking-[0.2em]`}
                  id="aesthetic-edit-secret"
                  inputMode="numeric"
                  onChange={(event) =>
                    setEditSecret(event.target.value.replace(/\D/g, ""))
                  }
                  type="password"
                  value={editSecret}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button onClick={() => setEditor(null)} variant="outline">
              Cancelar
            </Button>
            <Button
              disabled={!editSecret || saving}
              onClick={() => void save()}
            >
              {saving ? "Guardando…" : "Guardar borrador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(signRecord)}
        onOpenChange={(open) => !open && setSignRecord(null)}
      >
        <DialogContent className="max-w-md rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Firma de la especialista</DialogTitle>
            <DialogDescription>
              Sólo {signRecord?.specialistName} puede firmar. Después de firmar,
              el registro queda bloqueado.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="aesthetic-sign-code">
              Código personal de la especialista
            </Label>
            <Input
              autoComplete="one-time-code"
              className={`${controlClass} mt-1.5 tracking-[0.2em]`}
              id="aesthetic-sign-code"
              inputMode="numeric"
              onChange={(event) =>
                setSignCode(event.target.value.replace(/\D/g, ""))
              }
              type="password"
              value={signCode}
            />
          </div>
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button onClick={() => setSignRecord(null)} variant="outline">
              Cancelar
            </Button>
            <Button disabled={!signCode || signing} onClick={() => void sign()}>
              {signing ? "Firmando…" : "Firmar y bloquear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
