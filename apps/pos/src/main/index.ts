import "dotenv/config";
import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import type {
  ApiResponse,
  PosOfflineBootstrapDto,
  PosOfflineOperationKind,
  PosOfflinePushResultDto,
  PosSessionDto,
} from "@cosmetics/types";
import { PosOfflineRepository } from "./offline-repository";

const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const apiUrl = (process.env["POS_API_URL"] ?? "http://localhost:4000").replace(/\/$/, "");
let mainWindow: BrowserWindow | null = null;
let offlineRepository: PosOfflineRepository | null = null;
let repositoryError: string | null = null;
let activeBootstrap: PosOfflineBootstrapDto | null = null;

function bootstrapForRenderer(
  bootstrap: PosOfflineBootstrapDto | null,
): PosOfflineBootstrapDto | null {
  return bootstrap ? { ...bootstrap, grantToken: "" } : null;
}

function unavailable(message: string) {
  return {
    status: 503,
    body: { success: false, message, data: null },
    offline: false,
    bootstrap: null,
  };
}

async function parseBody<T>(response: Response): Promise<ApiResponse<T>> {
  return (await response.json()) as ApiResponse<T>;
}

ipcMain.handle(
  "pos:login",
  async (_event, input: { alias: string; pin: string }) => {
    const terminalCode = process.env["POS_TERMINAL_CODE"];
    const terminalSecret = process.env["POS_TERMINAL_SECRET"];
    if (!terminalCode || !terminalSecret) {
      return unavailable("Esta terminal todavía no está provisionada.");
    }

    try {
      const response = await fetch(`${apiUrl}/api/pos/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          alias: input.alias,
          pin: input.pin,
          terminalCode,
          terminalSecret,
        }),
      });
      const body = await parseBody<PosSessionDto>(response);
      if (!response.ok || !body.success) {
        return { status: response.status, body, offline: false, bootstrap: null };
      }

      let bootstrap: PosOfflineBootstrapDto | null = null;
      if (offlineRepository) {
        try {
          const bootstrapResponse = await fetch(`${apiUrl}/api/pos/sync/bootstrap`, {
            headers: { Authorization: `Bearer ${body.data.accessToken}` },
          });
          const bootstrapBody = await parseBody<PosOfflineBootstrapDto>(bootstrapResponse);
          if (bootstrapResponse.ok && bootstrapBody.success) {
            bootstrap = bootstrapBody.data;
            offlineRepository.saveOnlineLogin(input.alias, input.pin, bootstrap);
          }
        } catch {
          // El login online sigue siendo válido aunque no se pueda renovar la caché.
        }
      }
      activeBootstrap = bootstrap;
      return {
        status: response.status,
        body,
        offline: false,
        bootstrap: bootstrapForRenderer(bootstrap),
      };
    } catch {
      if (!offlineRepository) {
        return unavailable(repositoryError ?? "No fue posible conectar con la API del POS.");
      }
      try {
        const bootstrap = offlineRepository.authenticate(input.alias, input.pin);
        if (!bootstrap) {
          return {
            status: 401,
            body: {
              success: false,
              message: "El acceso offline no está habilitado, no coincide o ya caducó.",
              data: null,
            },
            offline: true,
            bootstrap: null,
          };
        }
        activeBootstrap = bootstrap;
        const session: PosSessionDto = { ...bootstrap.session, accessToken: "" };
        return {
          status: 200,
          body: { success: true, message: "Autenticación offline exitosa", data: session },
          offline: true,
          bootstrap: bootstrapForRenderer(bootstrap),
        };
      } catch {
        return unavailable("No fue posible abrir el repositorio offline protegido.");
      }
    }
  },
);

ipcMain.handle(
  "pos:offline:enqueue",
  async (
    _event,
    input: {
      kind: PosOfflineOperationKind;
      entityId?: string | null;
      dependsOn?: string[];
      payload: Record<string, unknown>;
      createdAt?: string;
    },
  ) => {
    if (!offlineRepository || !activeBootstrap) {
      throw new Error("El repositorio offline no tiene una sesión habilitada");
    }
    const operation = offlineRepository.enqueue(input, activeBootstrap);
    return { id: operation.id, sequence: operation.sequence, status: "PENDING" as const };
  },
);

ipcMain.handle("pos:offline:status", async () => {
  if (!offlineRepository || !activeBootstrap) return [];
  return offlineRepository
    .listOutbox(activeBootstrap.session.terminal.id)
    .map((entry) => ({
      id: entry.operation.id,
      sequence: entry.operation.sequence,
      kind: entry.operation.kind,
      status: entry.status,
      attempts: entry.attempts,
      errorMessage: entry.errorMessage,
    }));
});

ipcMain.handle("pos:offline:authorize", async (_event, pin: string) => {
  if (!offlineRepository || !activeBootstrap || typeof pin !== "string")
    return false;
  const verified = offlineRepository.authenticate(
    activeBootstrap.session.actor.alias,
    pin,
  );
  return Boolean(
    verified &&
    verified.session.actor.id === activeBootstrap.session.actor.id &&
    verified.session.terminal.id === activeBootstrap.session.terminal.id,
  );
});

ipcMain.handle("pos:offline:sync", async () => {
  if (!offlineRepository || !activeBootstrap) {
    throw new Error("El repositorio offline no tiene una sesión habilitada");
  }
  const candidates = offlineRepository
    .listOutbox(activeBootstrap.session.terminal.id)
    .filter((entry) => ["PENDING", "ERROR", "SYNCING"].includes(entry.status))
    .slice(0, 100);
  const first = candidates[0];
  const boundary = first
    ? candidates.findIndex((entry) => entry.grantToken !== first.grantToken)
    : -1;
  const pending = first
    ? candidates.slice(0, boundary === -1 ? candidates.length : boundary)
    : [];
  if (pending.length === 0) {
    return { results: [], nextSequence: activeBootstrap.nextSequence } satisfies PosOfflinePushResultDto;
  }
  const ids = pending.map((entry) => entry.operation.id);
  offlineRepository.markSyncing(ids);
  try {
    const response = await fetch(`${apiUrl}/api/pos/sync/push`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${pending[0]!.grantToken}`,
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ operations: pending.map((entry) => entry.operation) }),
    });
    const body = await parseBody<PosOfflinePushResultDto>(response);
    if (!response.ok || !body.success) throw new Error(body.message);
    offlineRepository.applySyncResults(body.data.results, ids);
    activeBootstrap = { ...activeBootstrap, nextSequence: body.data.nextSequence };
    return body.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible sincronizar";
    offlineRepository.markTransportError(ids, message);
    throw error;
  }
});

ipcMain.handle("pos:offline:logout", async () => {
  activeBootstrap = null;
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
}

app.whenReady().then(async () => {
  try {
    offlineRepository = await PosOfflineRepository.open(
      path.join(app.getPath("userData"), "offline"),
    );
  } catch (error) {
    repositoryError = error instanceof Error ? error.message : "Repositorio offline no disponible";
    console.error("[pos.offline.repository]", repositoryError);
  }
  createWindow();
});

app.on("before-quit", () => {
  offlineRepository?.close();
  offlineRepository = null;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
