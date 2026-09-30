"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@cosmetics/ui";
import { SchedulerSessionProvider } from "../src/lib/session";
import {
  createDesignState,
  designAccountForControls,
  designDemoAccounts,
  designSessionToken,
  designStore,
  type DesignAccountId,
  type DesignScenario,
} from "./store";

export function SchedulerRuntime({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState("");
  const [revision, setRevision] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let active = true;
    async function initialize() {
      const { startDesignWorker } = await import("./browser");
      await startDesignWorker();
      if (!active) return;
      const stored = localStorage.getItem("auth_token");
      const storedIdentity = stored?.replace("design-token-", "");
      const storedAccount = designDemoAccounts.find(
        (account) => account.id === storedIdentity,
      );
      const legacyAccount = designDemoAccounts.find(
        (account) => account.role === storedIdentity,
      );
      const account =
        storedAccount ??
        legacyAccount ??
        designAccountForControls(designStore.state.controls);
      designStore.state.controls.accountId = account.id;
      designStore.state.controls.role = account.role;
      localStorage.setItem("auth_token", designSessionToken(account.id));
      setReady(true);
    }
    void initialize().catch((error: unknown) => {
      if (active)
        setFailure(
          error instanceof Error
            ? error.message
            : "No se pudo iniciar el entorno de diseño.",
        );
    });
    return () => {
      active = false;
    };
  }, []);

  function switchAccount(accountId: DesignAccountId) {
    const account = designDemoAccounts.find((item) => item.id === accountId)!;
    designStore.state.controls.accountId = account.id;
    designStore.state.controls.role = account.role;
    designStore.state.authorizations.clear();
    localStorage.setItem("auth_token", designSessionToken(account.id));
    setRevision((value) => value + 1);
  }
  function reset(
    scenario = designStore.state.controls.scenario,
    date = designStore.state.controls.date,
  ) {
    designStore.state = createDesignState({
      ...designStore.state.controls,
      scenario,
      date,
    });
    setRevision((value) => value + 1);
  }
  if (failure)
    return (
      <main className="mx-auto max-w-xl space-y-4 p-8" role="alert">
        <h1 className="text-xl font-semibold">
          No se inició el modo de diseño
        </h1>
        <p>{failure}</p>
        <p>
          Ejecuta dev:design en localhost. El servicio simulado debe estar listo
          para abrir la aplicación.
        </p>
        <Button onClick={() => window.location.reload()}>Reintentar</Button>
      </main>
    );
  if (!ready)
    return (
      <main className="p-8" aria-live="polite">
        Preparando datos de diseño…
      </main>
    );
  const { controls, movements } = designStore.state;
  return (
    <>
      <SchedulerSessionProvider key={revision}>
        {children}
      </SchedulerSessionProvider>
      <aside
        aria-label="Entorno de diseño"
        className="fixed bottom-3 right-3 z-[60] flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-2 shadow-lg"
      >
        <span className="px-1 text-xs font-semibold text-amber-950">
          Demo · datos ficticios
        </span>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Controles de diseño
        </Button>
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Entorno del PO</SheetTitle>
            <SheetDescription>
              Los cambios viven en memoria y se restablecen al recargar. Los
              mensajes y archivos son simulados.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="design-role">Perfil de prueba</Label>
              <Select
                value={controls.accountId}
                onValueChange={(value) =>
                  switchAccount(value as DesignAccountId)
                }
              >
                <SelectTrigger id="design-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {designDemoAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} · {account.accessLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Código personal ficticio:{" "}
                {designAccountForControls(controls).authorizationCode}. Cambiar
                de usuario invalida autorizaciones pendientes.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="design-scenario">Escenario</Label>
              <Select
                value={controls.scenario}
                onValueChange={(value) => reset(value as DesignScenario)}
              >
                <SelectTrigger id="design-scenario">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">
                    Datos y guardados normales
                  </SelectItem>
                  <SelectItem value="empty">Agenda sin citas</SelectItem>
                  <SelectItem value="slow">Carga lenta</SelectItem>
                  <SelectItem value="error">Error al consultar</SelectItem>
                  <SelectItem value="conflict">Conflicto al guardar</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Cambiar escenario restablece los datos.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="design-date">Fecha de las citas de ejemplo</Label>
              <Input
                id="design-date"
                type="date"
                value={controls.date}
                onChange={(event) => {
                  if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value))
                    reset(controls.scenario, event.target.value);
                }}
              />
              <p className="text-xs text-slate-500">
                Navega a esta fecha con el calendario de Agenda.
              </p>
            </div>
            <Button variant="outline" onClick={() => reset()}>
              Restablecer datos de la demo
            </Button>
            <section className="space-y-3" aria-label="Movimientos de la demo">
              <h2 className="font-semibold">Movimientos de la demo</h2>
              <p className="text-xs text-slate-500">
                Registro local de guardados y descargas. No representa la
                auditoría productiva.
              </p>
              {movements.length === 0 ? (
                <p className="text-sm">Todavía no hay movimientos.</p>
              ) : (
                movements.map((movement) => (
                  <div
                    key={movement.id}
                    className="rounded-lg border p-3 text-xs"
                  >
                    <p className="font-semibold">{movement.actor}</p>
                    <p className="mt-1 break-all">{movement.action}</p>
                    <time className="mt-1 block text-slate-500">
                      {new Date(movement.createdAt).toLocaleString("es-MX")}
                    </time>
                  </div>
                ))
              )}
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
