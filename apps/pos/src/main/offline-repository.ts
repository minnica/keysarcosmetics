import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { safeStorage } from "electron";
import type {
  PosOfflineBootstrapDto,
  PosOfflineOperationDto,
  PosOfflineOperationKind,
  PosSyncStatus,
} from "@cosmetics/types";

interface SqliteStatement {
  run(...values: unknown[]): { changes: number | bigint };
  get(...values: unknown[]): unknown;
  all(...values: unknown[]): unknown[];
}

interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  close(): void;
}

interface SqliteModule {
  DatabaseSync: new (path: string) => SqliteDatabase;
}

interface CredentialRow {
  alias: string;
  pinSalt: string;
  pinVerifier: string;
  bootstrap: string;
  grantExpiresAt: string;
}

interface OutboxRow {
  id: string;
  sequence: number;
  payload: string;
  status: PosSyncStatus;
  attempts: number;
  errorMessage: string | null;
}

export interface LocalOutboxEntry {
  operation: PosOfflineOperationDto;
  grantToken: string;
  status: PosSyncStatus;
  attempts: number;
  errorMessage: string | null;
}

function normalizeAlias(value: string): string {
  return value.trim().toLocaleLowerCase("es-MX");
}

function pinVerifier(pin: string, salt: Buffer): Buffer {
  return scryptSync(pin, salt, 32, { N: 16_384, r: 8, p: 1 });
}

export class PosOfflineRepository {
  private constructor(
    private readonly database: SqliteDatabase,
    private readonly encryptionKey: Buffer,
  ) {}

  static async open(directory: string): Promise<PosOfflineRepository> {
    await mkdir(directory, { recursive: true });
    const sqliteModuleName = "node:sqlite";
    let sqlite: SqliteModule;
    try {
      sqlite = (await import(/* @vite-ignore */ sqliteModuleName)) as SqliteModule;
    } catch {
      throw new Error(
        "El runtime de Electron no incluye node:sqlite; actualiza Electron a una versión con Node.js 22.5 o posterior.",
      );
    }
    const keyPath = path.join(directory, "pos-offline.key");
    const encryptionKey = await PosOfflineRepository.loadDeviceKey(keyPath);
    const database = new sqlite.DatabaseSync(path.join(directory, "pos-offline.sqlite3"));
    database.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA foreign_keys = ON;");
    database.exec(`
      CREATE TABLE IF NOT EXISTS offline_credentials (
        alias TEXT PRIMARY KEY,
        pin_salt TEXT NOT NULL,
        pin_verifier TEXT NOT NULL,
        bootstrap TEXT NOT NULL,
        grant_expires_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS offline_outbox (
        id TEXT PRIMARY KEY,
        terminal_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('PENDING','SYNCING','SYNCED','ERROR','CONFLICT')),
        attempts INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(terminal_id, sequence)
      );
      CREATE INDEX IF NOT EXISTS offline_outbox_pending_idx
        ON offline_outbox(terminal_id, status, sequence);
    `);
    return new PosOfflineRepository(database, encryptionKey);
  }

  private static async loadDeviceKey(keyPath: string): Promise<Buffer> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("El almacén seguro del sistema no está disponible para proteger la clave offline.");
    }
    try {
      const wrapped = await readFile(keyPath);
      const decoded = safeStorage.decryptString(wrapped);
      const key = Buffer.from(decoded, "base64");
      if (key.length !== 32) throw new Error("Clave offline inválida");
      return key;
    } catch (error) {
      if (error instanceof Error && !error.message.includes("ENOENT")) throw error;
      const key = randomBytes(32);
      await writeFile(keyPath, safeStorage.encryptString(key.toString("base64")), {
        mode: 0o600,
        flag: "wx",
      });
      return key;
    }
  }

  private encrypt(value: unknown): string {
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey, nonce);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(value), "utf8"),
      cipher.final(),
    ]);
    return Buffer.concat([Buffer.from([1]), nonce, cipher.getAuthTag(), encrypted]).toString("base64");
  }

  private decrypt<T>(value: string): T {
    const envelope = Buffer.from(value, "base64");
    if (envelope[0] !== 1 || envelope.length < 30) throw new Error("Payload offline inválido");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.encryptionKey,
      envelope.subarray(1, 13),
    );
    decipher.setAuthTag(envelope.subarray(13, 29));
    const clear = Buffer.concat([
      decipher.update(envelope.subarray(29)),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(clear) as T;
  }

  saveOnlineLogin(alias: string, pin: string, bootstrap: PosOfflineBootstrapDto): void {
    const normalizedAlias = normalizeAlias(alias);
    const salt = randomBytes(32);
    const now = new Date().toISOString();
    this.database
      .prepare(`
        INSERT INTO offline_credentials(alias, pin_salt, pin_verifier, bootstrap, grant_expires_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(alias) DO UPDATE SET
          pin_salt = excluded.pin_salt,
          pin_verifier = excluded.pin_verifier,
          bootstrap = excluded.bootstrap,
          grant_expires_at = excluded.grant_expires_at,
          updated_at = excluded.updated_at
      `)
      .run(
        normalizedAlias,
        salt.toString("base64"),
        pinVerifier(pin, salt).toString("base64"),
        this.encrypt(bootstrap),
        bootstrap.grantExpiresAt,
        now,
      );
  }

  authenticate(alias: string, pin: string): PosOfflineBootstrapDto | null {
    const row = this.database
      .prepare(`
        SELECT alias, pin_salt AS pinSalt, pin_verifier AS pinVerifier,
               bootstrap, grant_expires_at AS grantExpiresAt
        FROM offline_credentials WHERE alias = ?
      `)
      .get(normalizeAlias(alias)) as CredentialRow | undefined;
    if (!row || new Date(row.grantExpiresAt).getTime() <= Date.now()) return null;
    const actual = pinVerifier(pin, Buffer.from(row.pinSalt, "base64"));
    const expected = Buffer.from(row.pinVerifier, "base64");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    return this.decrypt<PosOfflineBootstrapDto>(row.bootstrap);
  }

  enqueue(input: {
    kind: PosOfflineOperationKind;
    entityId?: string | null;
    payload: Record<string, unknown>;
    createdAt?: string;
  }, bootstrap: PosOfflineBootstrapDto): PosOfflineOperationDto {
    const terminalId = bootstrap.session.terminal.id;
    let operation: PosOfflineOperationDto | null = null;
    this.transaction(() => {
      const row = this.database
        .prepare("SELECT MAX(sequence) AS sequence FROM offline_outbox WHERE terminal_id = ?")
        .get(terminalId) as { sequence: number | null };
      const sequence = Math.max(bootstrap.nextSequence - 1, row.sequence ?? 0) + 1;
      operation = {
        id: crypto.randomUUID(),
        sequence,
        kind: input.kind,
        entityId: input.entityId ?? null,
        idempotencyKey: crypto.randomUUID(),
        createdAt: input.createdAt ?? new Date().toISOString(),
        payload: input.payload,
      };
      const now = new Date().toISOString();
      this.database.prepare(`
        INSERT INTO offline_outbox(id, terminal_id, sequence, payload, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'PENDING', ?, ?)
      `).run(
        operation.id,
        terminalId,
        sequence,
        this.encrypt({ operation, grantToken: bootstrap.grantToken }),
        operation.createdAt,
        now,
      );
    });
    if (!operation) throw new Error("No fue posible guardar la operación offline");
    return operation;
  }

  listOutbox(terminalId: string, includeSynced = false): LocalOutboxEntry[] {
    const rows = this.database
      .prepare(`
        SELECT id, sequence, payload, status, attempts, error_message AS errorMessage
        FROM offline_outbox
        WHERE terminal_id = ? ${includeSynced ? "" : "AND status <> 'SYNCED'"}
        ORDER BY sequence ASC
      `)
      .all(terminalId) as OutboxRow[];
    return rows.map((row) => {
      const envelope = this.decrypt<{
        operation: PosOfflineOperationDto;
        grantToken: string;
      }>(row.payload);
      return {
        operation: envelope.operation,
        grantToken: envelope.grantToken,
        status: row.status,
        attempts: row.attempts,
        errorMessage: row.errorMessage,
      };
    });
  }

  markSyncing(ids: string[]): void {
    const statement = this.database.prepare(`
      UPDATE offline_outbox SET status = 'SYNCING', attempts = attempts + 1,
        error_message = NULL, updated_at = ? WHERE id = ? AND status IN ('PENDING','ERROR','SYNCING')
    `);
    const now = new Date().toISOString();
    this.transaction(() => ids.forEach((id) => statement.run(now, id)));
  }

  applySyncResults(
    results: Array<{ id: string; status: PosSyncStatus; message: string }>,
    attemptedIds: string[],
  ): void {
    const reset = this.database.prepare(`
      UPDATE offline_outbox SET status = 'PENDING', error_message = NULL, updated_at = ?
      WHERE id = ? AND status = 'SYNCING'
    `);
    const statement = this.database.prepare(`
      UPDATE offline_outbox SET status = ?, error_message = ?, updated_at = ? WHERE id = ?
    `);
    const now = new Date().toISOString();
    this.transaction(() => {
      for (const id of attemptedIds) reset.run(now, id);
      for (const result of results) {
        statement.run(
          result.status,
          result.status === "SYNCED" ? null : result.message,
          now,
          result.id,
        );
      }
    });
  }

  markTransportError(ids: string[], message: string): void {
    const statement = this.database.prepare(`
      UPDATE offline_outbox SET status = 'ERROR', error_message = ?, updated_at = ?
      WHERE id = ? AND status = 'SYNCING'
    `);
    const now = new Date().toISOString();
    this.transaction(() => ids.forEach((id) => statement.run(message, now, id)));
  }

  private transaction(work: () => void): void {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      work();
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  close(): void {
    this.database.close();
    this.encryptionKey.fill(0);
  }
}
