"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  SCHEDULER_SETTING_SECTIONS,
  type SchedulerSettingScope,
  type SchedulerSettingSection,
} from "@cosmetics/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
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
import { LockKeyhole, Save } from "lucide-react";
import { schedulerApi } from "@/lib/api";
import { useSchedulerSession } from "@/lib/session";
import {
  ConflictNotice,
  QueryBoundary,
  WorkspaceHeader,
  runSchedulerMutation,
  useSchedulerQuery,
} from "./ApiState";

const sectionLabels: Record<SchedulerSettingSection, string> = {
  company: "Empresa",
  website: "Sitio web",
  agenda: "Agenda",
  payments: "Pagos",
  reminders: "Recordatorios",
  records: "Fichas médicas",
  emails: "Correos",
  integrations: "Integraciones",
  notifications: "Notificaciones",
  clients: "Clientes",
  surveys: "Encuestas",
};

function isSettingSection(value: string | null): value is SchedulerSettingSection {
  return SCHEDULER_SETTING_SECTIONS.some((section) => section === value);
}

function PersonalSecretSettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [secret, setSecret] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (secret.length < 6 || secret !== confirmation) {
      toast.error("El código debe tener al menos 6 caracteres y coincidir.");
      return;
    }
    setSaving(true);
    try {
      await schedulerApi.updateSecondarySecret({ currentPassword, secret });
      setCurrentPassword("");
      setSecret("");
      setConfirmation("");
      toast.success("Código personal actualizado.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No fue posible actualizar el código.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f1ed] text-[#263649]">
      <WorkspaceHeader eyebrow="Seguridad" title="Código personal" description="La credencial se valida y almacena con hash exclusivamente en el servidor." />
      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-7">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div><Label htmlFor="current-password">Contraseña actual</Label><Input id="current-password" className="mt-1.5" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></div>
            <div><Label htmlFor="new-secret">Nuevo código</Label><Input id="new-secret" className="mt-1.5" type="password" value={secret} onChange={(event) => setSecret(event.target.value)} /></div>
            <div><Label htmlFor="confirm-secret">Confirmar código</Label><Input id="confirm-secret" className="mt-1.5" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>
            <Button disabled={saving || !currentPassword} onClick={() => void save()}>{saving ? "Guardando…" : "Actualizar código"}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ApiSettingsWorkspace() {
  const searchParams = useSearchParams();
  const requestedSection = searchParams.get("section");
  const { bootstrap } = useSchedulerSession();
  const section: SchedulerSettingSection = isSettingSection(requestedSection) ? requestedSection : "company";
  const [scope, setScope] = useState<SchedulerSettingScope>("COMMERCE");
  const [commerceId, setCommerceId] = useState("");
  const [branchProfileId, setBranchProfileId] = useState("");
  const [documentText, setDocumentText] = useState("{}");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);

  const catalog = useSchedulerQuery(() => schedulerApi.operationalCatalog(), []);
  useEffect(() => {
    if (!commerceId && catalog.data?.commerces[0]) setCommerceId(catalog.data.commerces[0].id);
  }, [catalog.data, commerceId]);
  const authorizedProfiles = useMemo(
    () => catalog.data?.branches.filter((branch) => bootstrap?.authorizedBranchIds.includes(branch.branchId)) ?? [],
    [bootstrap?.authorizedBranchIds, catalog.data?.branches],
  );
  useEffect(() => {
    if (!branchProfileId && authorizedProfiles[0]) setBranchProfileId(authorizedProfiles[0].id);
  }, [authorizedProfiles, branchProfileId]);

  const resolved = useSchedulerQuery(
    () => schedulerApi.resolvedSetting(section, {
      commerceId,
      ...(branchProfileId ? { branchProfileId } : {}),
    }),
    [section, commerceId, branchProfileId],
    Boolean(commerceId),
  );
  useEffect(() => {
    if (!resolved.data || dirty) return;
    setDocumentText(JSON.stringify(resolved.data.document, null, 2));
  }, [dirty, resolved.data]);
  useEffect(() => {
    setDirty(false);
    setConflict(null);
  }, [section, commerceId, branchProfileId, scope]);

  if (requestedSection === "authorizations") return <PersonalSecretSettings />;

  const screenKey = `scheduler/settings/${section}` as const;
  const permission = bootstrap?.permissions.find((item) => item.screenKey === screenKey);
  const canWrite = permission?.capabilities.includes("WRITE") ?? false;
  const currentVersion = resolved.data?.layers.find((layer) => layer.scope === scope)?.version;

  async function save() {
    let document: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(documentText);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error();
      document = parsed as Record<string, unknown>;
    } catch {
      toast.error("La configuración debe ser un objeto JSON válido.");
      return;
    }
    if (scope === "BRANCH" && !branchProfileId) {
      toast.error("Selecciona una sucursal para esta capa.");
      return;
    }
    setSaving(true);
    await runSchedulerMutation(
      () => schedulerApi.updateSetting(section, {
        scope,
        commerceId,
        ...(scope === "BRANCH" ? { branchProfileId } : {}),
        document,
        ...(currentVersion ? { expectedVersion: currentVersion } : {}),
      }),
      {
        onSuccess: async () => {
          toast.success("Configuración guardada.");
          setDirty(false);
          await resolved.reload();
        },
        onError: toast.error,
        onConflict: setConflict,
      },
    );
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-[#f4f1ed] text-[#263649]">
      <WorkspaceHeader
        eyebrow="Configuración versionada"
        title={sectionLabels[section]}
        description="La configuración efectiva se resuelve en servidor con precedencia comercio, sucursal y usuario. No se usa almacenamiento local operativo."
        actions={!canWrite ? <Badge variant="outline"><LockKeyhole className="mr-1 h-3.5 w-3.5" /> Sólo lectura</Badge> : undefined}
      />
      <div className="space-y-5 px-5 py-6 sm:px-7 lg:px-10">
        <ConflictNotice message={conflict} onReload={() => { setConflict(null); setDirty(false); void resolved.reload(); }} />
        <Card>
          <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
            <div><Label>Comercio</Label><Select value={commerceId} onValueChange={setCommerceId}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecciona" /></SelectTrigger><SelectContent>{catalog.data?.commerces.filter((item) => item.active).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Sucursal de contexto</Label><Select value={branchProfileId} onValueChange={setBranchProfileId}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecciona" /></SelectTrigger><SelectContent>{authorizedProfiles.map((item) => <SelectItem key={item.id} value={item.id}>{item.branchName}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Capa a editar</Label><Select value={scope} onValueChange={(value) => setScope(value as SchedulerSettingScope)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="COMMERCE">Comercio</SelectItem><SelectItem value="BRANCH">Sucursal</SelectItem><SelectItem value="USER">Mi usuario</SelectItem></SelectContent></Select></div>
          </CardContent>
        </Card>
        <QueryBoundary loading={catalog.loading || resolved.loading} error={catalog.error ?? resolved.error} onRetry={() => { void catalog.reload(); void resolved.reload(); }}>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Precedencia: COMMERCE → BRANCH → USER</Badge>
                {resolved.data?.layers.map((layer) => <Badge key={`${layer.scope}-${layer.scopeReferenceId}`} variant="outline">{layer.scope} v{layer.version}</Badge>)}
              </div>
              <div><Label htmlFor="setting-document">Documento JSON efectivo</Label><Textarea id="setting-document" className="mt-1.5 min-h-[360px] font-mono text-xs" readOnly={!canWrite} value={documentText} onChange={(event) => { setDocumentText(event.target.value); setDirty(true); }} /></div>
              {canWrite ? <Button disabled={saving || !dirty} onClick={() => void save()}><Save className="mr-2 h-4 w-4" />{saving ? "Guardando…" : "Guardar capa"}</Button> : null}
            </CardContent>
          </Card>
        </QueryBoundary>
      </div>
    </div>
  );
}
