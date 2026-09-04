import type {
  PosOfflineBootstrapDto,
  PosOfflineOperationDto,
  PosOfflineOperationKind,
  PosOfflinePushResultDto,
  PosSyncStatus,
} from "@cosmetics/types";

const databaseName = "keysar-pos-offline";
const databaseVersion = 1;

interface BrowserOutboxRecord {
  id: string;
  terminalId: string;
  sequence: number;
  envelope: { iv: ArrayBuffer; ciphertext: ArrayBuffer };
  status: PosSyncStatus;
  attempts: number;
  errorMessage: string | null;
}

interface BrowserCredentialRecord {
  alias: string;
  pinSalt: ArrayBuffer;
  pinVerifier: ArrayBuffer;
  envelope: { iv: ArrayBuffer; ciphertext: ArrayBuffer };
  grantExpiresAt: string;
}

interface BrowserOutboxEnvelope {
  operation: PosOfflineOperationDto;
  grantToken: string;
}

export interface OfflineQueueStatus {
  id: string;
  sequence: number;
  kind: PosOfflineOperationKind;
  status: PosSyncStatus;
  attempts: number;
  errorMessage: string | null;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB no disponible"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("Transacción IndexedDB cancelada"));
    transaction.onerror = () => reject(transaction.error ?? new Error("Error de IndexedDB"));
  });
}

async function openDatabase(): Promise<IDBDatabase> {
  const request = indexedDB.open(databaseName, databaseVersion);
  request.onupgradeneeded = () => {
    const database = request.result;
    database.createObjectStore("keys");
    database.createObjectStore("credentials", { keyPath: "alias" });
    const outbox = database.createObjectStore("outbox", { keyPath: "id" });
    outbox.createIndex("terminalSequence", ["terminalId", "sequence"], { unique: true });
    outbox.createIndex("terminalStatus", ["terminalId", "status", "sequence"]);
  };
  return requestResult(request);
}

async function deviceKey(database: IDBDatabase): Promise<CryptoKey> {
  const read = database.transaction("keys", "readonly");
  const existing = await requestResult(read.objectStore("keys").get("device")) as CryptoKey | undefined;
  await transactionDone(read);
  if (existing) return existing;
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const write = database.transaction("keys", "readwrite");
  write.objectStore("keys").add(key, "device");
  await transactionDone(write);
  return key;
}

async function encrypt(key: CryptoKey, value: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const clear = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, clear);
  return { iv: iv.buffer, ciphertext };
}

async function decrypt<T>(
  key: CryptoKey,
  envelope: { iv: ArrayBuffer; ciphertext: ArrayBuffer },
): Promise<T> {
  const clear = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: envelope.iv },
    key,
    envelope.ciphertext,
  );
  return JSON.parse(new TextDecoder().decode(clear)) as T;
}

async function pinVerifier(pin: string, salt: ArrayBuffer): Promise<ArrayBuffer> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 210_000 },
    material,
    256,
  );
}

function equalBytes(left: ArrayBuffer, right: ArrayBuffer): boolean {
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index]! ^ b[index]!;
  return difference === 0;
}

export async function saveBrowserOfflineLogin(
  alias: string,
  pin: string,
  bootstrap: PosOfflineBootstrapDto,
): Promise<void> {
  const database = await openDatabase();
  const key = await deviceKey(database);
  const salt = crypto.getRandomValues(new Uint8Array(32)).buffer;
  const record: BrowserCredentialRecord = {
    alias: alias.trim().toLocaleLowerCase("es-MX"),
    pinSalt: salt,
    pinVerifier: await pinVerifier(pin, salt),
    envelope: await encrypt(key, bootstrap),
    grantExpiresAt: bootstrap.grantExpiresAt,
  };
  const transaction = database.transaction("credentials", "readwrite");
  transaction.objectStore("credentials").put(record);
  await transactionDone(transaction);
  database.close();
}

export async function authenticateBrowserOffline(
  alias: string,
  pin: string,
): Promise<PosOfflineBootstrapDto | null> {
  const database = await openDatabase();
  const transaction = database.transaction("credentials", "readonly");
  const record = await requestResult(
    transaction.objectStore("credentials").get(alias.trim().toLocaleLowerCase("es-MX")),
  ) as BrowserCredentialRecord | undefined;
  await transactionDone(transaction);
  if (!record || new Date(record.grantExpiresAt).getTime() <= Date.now()) {
    database.close();
    return null;
  }
  const actual = await pinVerifier(pin, record.pinSalt);
  if (!equalBytes(actual, record.pinVerifier)) {
    database.close();
    return null;
  }
  const bootstrap = await decrypt<PosOfflineBootstrapDto>(await deviceKey(database), record.envelope);
  database.close();
  return bootstrap;
}

export async function enqueueOfflineOperation(
  input: {
    kind: PosOfflineOperationKind;
    entityId?: string | null;
    payload: Record<string, unknown>;
    createdAt?: string;
  },
  bootstrap: PosOfflineBootstrapDto,
): Promise<{ id: string; sequence: number; status: "PENDING" }> {
  if (window.electronAPI) return window.electronAPI.posOfflineEnqueue(input);
  const database = await openDatabase();
  const key = await deviceKey(database);
  const read = database.transaction("outbox", "readonly");
  const records = await requestResult(read.objectStore("outbox").getAll()) as BrowserOutboxRecord[];
  await transactionDone(read);
  const terminalId = bootstrap.session.terminal.id;
  const sequence = Math.max(
    bootstrap.nextSequence - 1,
    ...records.filter((record) => record.terminalId === terminalId).map((record) => record.sequence),
  ) + 1;
  const operation: PosOfflineOperationDto = {
    id: crypto.randomUUID(),
    sequence,
    kind: input.kind,
    entityId: input.entityId ?? null,
    idempotencyKey: crypto.randomUUID(),
    createdAt: input.createdAt ?? new Date().toISOString(),
    payload: input.payload,
  };
  const envelope = await encrypt(key, {
    operation,
    grantToken: bootstrap.grantToken,
  } satisfies BrowserOutboxEnvelope);
  const write = database.transaction("outbox", "readwrite");
  write.objectStore("outbox").add({
    id: operation.id,
    terminalId,
    sequence,
    envelope,
    status: "PENDING",
    attempts: 0,
    errorMessage: null,
  } satisfies BrowserOutboxRecord);
  await transactionDone(write);
  database.close();
  return { id: operation.id, sequence, status: "PENDING" };
}

export async function offlineQueueStatus(
  bootstrap: PosOfflineBootstrapDto,
): Promise<OfflineQueueStatus[]> {
  if (window.electronAPI) return window.electronAPI.posOfflineStatus();
  const database = await openDatabase();
  const transaction = database.transaction("outbox", "readonly");
  const rows = await requestResult(transaction.objectStore("outbox").getAll()) as BrowserOutboxRecord[];
  await transactionDone(transaction);
  const key = await deviceKey(database);
  const result = await Promise.all(rows
    .filter((row) => row.terminalId === bootstrap.session.terminal.id && row.status !== "SYNCED")
    .sort((left, right) => left.sequence - right.sequence)
    .map(async (row) => {
      const { operation } = await decrypt<BrowserOutboxEnvelope>(key, row.envelope);
      return { id: row.id, sequence: row.sequence, kind: operation.kind, status: row.status, attempts: row.attempts, errorMessage: row.errorMessage };
    }));
  database.close();
  return result;
}

export async function syncOfflineOperations(
  bootstrap: PosOfflineBootstrapDto,
  push: (grantToken: string, operations: PosOfflineOperationDto[]) => Promise<PosOfflinePushResultDto>,
): Promise<PosOfflinePushResultDto> {
  if (window.electronAPI) return window.electronAPI.posOfflineSync();
  const database = await openDatabase();
  const key = await deviceKey(database);
  const read = database.transaction("outbox", "readonly");
  const candidates = (await requestResult(read.objectStore("outbox").getAll()) as BrowserOutboxRecord[])
    .filter((row) => row.terminalId === bootstrap.session.terminal.id && ["PENDING", "ERROR", "SYNCING"].includes(row.status))
    .sort((left, right) => left.sequence - right.sequence)
    .slice(0, 100);
  await transactionDone(read);
  const decoded = await Promise.all(candidates.map(async (row) => ({
    row,
    envelope: await decrypt<BrowserOutboxEnvelope>(key, row.envelope),
  })));
  const first = decoded[0];
  const boundary = first
    ? decoded.findIndex((entry) => entry.envelope.grantToken !== first.envelope.grantToken)
    : -1;
  const batch = first ? decoded.slice(0, boundary === -1 ? decoded.length : boundary) : [];
  const rows = batch.map((entry) => entry.row);
  const operations = batch.map((entry) => entry.envelope.operation);
  if (!first || operations.length === 0) {
    database.close();
    return { results: [], nextSequence: bootstrap.nextSequence };
  }
  const syncing = database.transaction("outbox", "readwrite");
  for (const row of rows) syncing.objectStore("outbox").put({ ...row, status: "SYNCING", attempts: row.attempts + 1 });
  await transactionDone(syncing);
  try {
    const result = await push(first.envelope.grantToken, operations);
    const write = database.transaction("outbox", "readwrite");
    const byId = new Map(result.results.map((item) => [item.id, item]));
    for (const row of rows) {
      const item = byId.get(row.id);
      write.objectStore("outbox").put({
        ...row,
        status: item?.status ?? "PENDING",
        attempts: row.attempts + 1,
        errorMessage: item ? (item.status === "SYNCED" ? null : item.message) : null,
      });
    }
    await transactionDone(write);
    database.close();
    return result;
  } catch (error) {
    const write = database.transaction("outbox", "readwrite");
    const message = error instanceof Error ? error.message : "No fue posible sincronizar";
    for (const row of rows) write.objectStore("outbox").put({
      ...row,
      status: "ERROR",
      attempts: row.attempts + 1,
      errorMessage: message,
    });
    await transactionDone(write);
    database.close();
    throw error;
  }
}
