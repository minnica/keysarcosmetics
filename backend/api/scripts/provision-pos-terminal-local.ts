import {
  chmodSync,
  existsSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import type {
  ApiResponse,
  PosMasterAuthorizationDto,
  PosSessionDto,
  PosTerminalDto,
  PosTerminalRegistrationResultDto,
} from "@cosmetics/types";

const CONFIRMATION = "LOCAL_SYNTHETIC_ONLY";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const DATASET_PATTERN = /^[a-z0-9][a-z0-9-]{2,31}$/;
const PURPOSE = "EMPLOYEES_ACCESS";

type Command = "provision" | "verify";
type DemoCredentials = {
  schemaVersion: 1;
  datasetId: string;
  master: {
    alias: string;
    pin: string;
    email: string;
    password: string;
  };
  operator: { alias: string; pin: string };
  terminal: { code: string; secret: string };
};
type PreparedTerminal = {
  schemaVersion: 1;
  datasetId: string;
  generatedAt: string;
  apiUrl: string;
  terminal: {
    id: string;
    code: string;
    secret: string;
    branchId: string;
  };
};
type Context = {
  command: Command;
  datasetId: string;
  apiUrl: string;
  sourceFile: string;
  outputFile: string;
  terminalCode: string;
};

function fail(message: string): never {
  throw new Error(message);
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  return value || fail(`Falta ${name}.`);
}

function statePath(input: string, name: string): string {
  const repoRoot = resolve(__dirname, "../../..");
  const stateRoot = realpathSync(resolve(repoRoot, ".pos-runner"));
  const path = resolve(input);
  const relation = relative(stateRoot, path);
  if (!relation || relation.startsWith("..") || relation.includes("../")) {
    fail(`${name} debe quedar dentro de ${stateRoot}.`);
  }
  const realParent = realpathSync(dirname(path));
  const realRelation = relative(stateRoot, realParent);
  if (realRelation.startsWith("..") || realRelation.includes("../")) {
    fail(`El directorio real de ${name} debe quedar dentro de ${stateRoot}.`);
  }
  if (existsSync(path)) {
    const realFileRelation = relative(stateRoot, realpathSync(path));
    if (realFileRelation.startsWith("..") || realFileRelation.includes("../")) {
      fail(`El archivo real de ${name} debe quedar dentro de ${stateRoot}.`);
    }
  }
  return path;
}

function assertPrivateDirectory(path: string, name: string): void {
  const mode = statSync(realpathSync(path)).mode & 0o777;
  if ((mode & 0o077) !== 0) {
    fail(`El directorio de ${name} debe tener modo 0700 o más restrictivo.`);
  }
}

function assertPrivateFile(path: string, name: string): void {
  const mode = statSync(path).mode & 0o777;
  if ((mode & 0o077) !== 0) {
    fail(`${name} debe tener modo 0600 o más restrictivo.`);
  }
  assertPrivateDirectory(dirname(path), name);
}

function parseApiUrl(): string {
  let url: URL;
  try {
    url = new URL(requiredEnvironment("POS_TERMINAL_API_URL"));
  } catch {
    return fail("POS_TERMINAL_API_URL no es una URL válida.");
  }
  if (url.protocol !== "http:" || !LOCAL_HOSTS.has(url.hostname)) {
    fail("POS_TERMINAL_API_URL debe usar HTTP sobre loopback.");
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !["", "/"].includes(url.pathname)
  ) {
    fail(
      "POS_TERMINAL_API_URL no debe incluir credenciales, ruta ni parámetros.",
    );
  }
  return url.href.replace(/\/$/, "");
}

function context(): Context {
  if (process.env.POS_TERMINAL_CONFIRMATION !== CONFIRMATION) {
    fail(
      `Define POS_TERMINAL_CONFIRMATION=${CONFIRMATION} para preparar una terminal sintética local.`,
    );
  }
  const command = process.argv[2] as Command | undefined;
  if (command !== "provision" && command !== "verify") {
    fail("Uso: provision-pos-terminal-local.ts provision|verify");
  }
  const datasetId = requiredEnvironment("POS_TERMINAL_DATASET_ID");
  if (!DATASET_PATTERN.test(datasetId)) {
    fail(
      "POS_TERMINAL_DATASET_ID debe ser un slug minúsculo de 3 a 32 caracteres.",
    );
  }
  return {
    command,
    datasetId,
    apiUrl: parseApiUrl(),
    sourceFile: statePath(
      requiredEnvironment("POS_TERMINAL_SOURCE_CREDENTIALS_FILE"),
      "POS_TERMINAL_SOURCE_CREDENTIALS_FILE",
    ),
    outputFile: statePath(
      requiredEnvironment("POS_TERMINAL_OUTPUT_FILE"),
      "POS_TERMINAL_OUTPUT_FILE",
    ),
    terminalCode: `PO-PREP-${datasetId}`.toLocaleUpperCase("en-US"),
  };
}

function loadJson(path: string, name: string): unknown {
  if (!existsSync(path)) fail(`No existe ${name}.`);
  assertPrivateFile(path, name);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    return fail(`${name} no contiene JSON válido.`);
  }
}

function loadDemoCredentials(input: Context): DemoCredentials {
  const value = loadJson(
    input.sourceFile,
    "POS_TERMINAL_SOURCE_CREDENTIALS_FILE",
  ) as Partial<DemoCredentials>;
  if (
    value.schemaVersion !== 1 ||
    value.datasetId !== input.datasetId ||
    typeof value.master?.alias !== "string" ||
    !/^\d{6}$/.test(value.master.pin ?? "") ||
    typeof value.master.email !== "string" ||
    typeof value.master.password !== "string" ||
    typeof value.operator?.alias !== "string" ||
    !/^\d{6}$/.test(value.operator.pin ?? "") ||
    typeof value.terminal?.code !== "string" ||
    typeof value.terminal.secret !== "string" ||
    value.terminal.secret.length < 32
  ) {
    fail("Las credenciales fuente no corresponden al dataset sintético.");
  }
  return value as DemoCredentials;
}

function isPreparedTerminal(
  value: unknown,
  input: Context,
): value is PreparedTerminal {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PreparedTerminal>;
  return (
    candidate.schemaVersion === 1 &&
    candidate.datasetId === input.datasetId &&
    candidate.apiUrl === input.apiUrl &&
    candidate.terminal?.code === input.terminalCode &&
    typeof candidate.terminal.id === "string" &&
    typeof candidate.terminal.branchId === "string" &&
    typeof candidate.terminal.secret === "string" &&
    candidate.terminal.secret.length >= 32
  );
}

function loadPreparedTerminal(input: Context): PreparedTerminal {
  const value = loadJson(input.outputFile, "POS_TERMINAL_OUTPUT_FILE");
  if (!isPreparedTerminal(value, input)) {
    fail(
      "El archivo de terminal preparada no corresponde al entorno solicitado.",
    );
  }
  return value;
}

function writePreparedTerminal(
  input: Context,
  terminal: PosTerminalDto,
  terminalSecret: string,
): PreparedTerminal {
  if (!terminal.branch) fail("La terminal registrada no tiene sucursal.");
  if (terminalSecret.length < 32) {
    fail("El API devolvió un secreto de terminal inválido.");
  }
  const value: PreparedTerminal = {
    schemaVersion: 1,
    datasetId: input.datasetId,
    generatedAt: new Date().toISOString(),
    apiUrl: input.apiUrl,
    terminal: {
      id: terminal.id,
      code: terminal.code,
      secret: terminalSecret,
      branchId: terminal.branch.id,
    },
  };
  assertPrivateDirectory(dirname(input.outputFile), "POS_TERMINAL_OUTPUT_FILE");
  writeFileSync(input.outputFile, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  chmodSync(input.outputFile, 0o600);
  return value;
}

async function request<T>(
  input: Context,
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: ApiResponse<T> }> {
  const response = await fetch(`${input.apiUrl}${path}`, {
    ...init,
    redirect: "error",
  });
  let body: ApiResponse<T>;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    return fail(`${path} devolvió una respuesta no JSON (${response.status}).`);
  }
  return { status: response.status, body };
}

function json(method: string, body: unknown, token?: string): RequestInit {
  return {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  };
}

function expectSuccess<T>(
  result: { status: number; body: ApiResponse<T> },
  expectedStatus: number,
  label: string,
): T {
  if (result.status !== expectedStatus || !result.body.success) {
    fail(`${label} falló (${result.status}): ${result.body.message}`);
  }
  return result.body.data;
}

async function sharedLogin(
  input: Context,
  credentials: DemoCredentials,
): Promise<string> {
  const result = await request<{ token: string }>(
    input,
    "/api/auth/login",
    json("POST", {
      email: credentials.master.email,
      password: credentials.master.password,
    }),
  );
  return expectSuccess(result, 200, "Login administrativo").token;
}

async function posLogin(
  input: Context,
  alias: string,
  pin: string,
  terminal: { code: string; secret: string },
): Promise<PosSessionDto> {
  const result = await request<PosSessionDto>(
    input,
    "/api/pos/auth/login",
    json("POST", {
      alias,
      pin,
      terminalCode: terminal.code,
      terminalSecret: terminal.secret,
    }),
  );
  return expectSuccess(result, 200, `Login POS de ${alias}`);
}

async function listTerminals(
  input: Context,
  posToken: string,
): Promise<PosTerminalDto[]> {
  const result = await request<PosTerminalDto[]>(input, "/api/pos/terminals", {
    headers: { authorization: `Bearer ${posToken}` },
  });
  return expectSuccess(result, 200, "Consulta de terminales");
}

async function provision(
  input: Context,
  credentials: DemoCredentials,
): Promise<void> {
  const [sharedToken, sourceSession] = await Promise.all([
    sharedLogin(input, credentials),
    posLogin(input, credentials.master.alias, credentials.master.pin, {
      code: credentials.terminal.code,
      secret: credentials.terminal.secret,
    }),
  ]);
  let terminals = await listTerminals(input, sourceSession.accessToken);
  let terminal = terminals.find((item) => item.code === input.terminalCode);
  let prepared: PreparedTerminal | null = existsSync(input.outputFile)
    ? loadPreparedTerminal(input)
    : null;

  if (!terminal) {
    if (prepared) {
      fail("El archivo local existe, pero la terminal ya no existe en el API.");
    }
    const registered = expectSuccess(
      await request<PosTerminalRegistrationResultDto>(
        input,
        "/api/pos/terminals",
        json(
          "POST",
          {
            code: input.terminalCode,
            name: `Preparación local sintética ${input.datasetId}`,
            branchId: sourceSession.terminal.branch.id,
          },
          sharedToken,
        ),
      ),
      201,
      "Registro de terminal",
    );
    terminal = registered.terminal;
    prepared = writePreparedTerminal(
      input,
      registered.terminal,
      registered.terminalSecret,
    );
  } else if (!prepared) {
    const rotated = expectSuccess(
      await request<PosTerminalRegistrationResultDto>(
        input,
        `/api/pos/terminals/${terminal.id}/rotate-secret`,
        json("POST", {}, sharedToken),
      ),
      200,
      "Recuperación local del secreto",
    );
    terminal = rotated.terminal;
    prepared = writePreparedTerminal(
      input,
      rotated.terminal,
      rotated.terminalSecret,
    );
  }

  if (prepared.terminal.id !== terminal.id) {
    fail("La terminal del API no coincide con el archivo local protegido.");
  }
  if (terminal.branch?.id !== sourceSession.terminal.branch.id) {
    fail(
      "La terminal preparada no pertenece a la sucursal sintética esperada.",
    );
  }
  if (terminal.status !== "ACTIVE") {
    terminal = expectSuccess(
      await request<PosTerminalDto>(
        input,
        `/api/pos/terminals/${terminal.id}/status`,
        json("PATCH", { status: "ACTIVE" }, sharedToken),
      ),
      200,
      "Activación de terminal",
    );
  }

  console.log(
    JSON.stringify({
      result: "PASS",
      action: "provision",
      terminalStatus: terminal.status,
      branchMatches: true,
      secretFile: relative(resolve(__dirname, "../../.."), input.outputFile),
    }),
  );
}

async function verify(
  input: Context,
  credentials: DemoCredentials,
): Promise<void> {
  const prepared = loadPreparedTerminal(input);
  const terminalCredentials = {
    code: prepared.terminal.code,
    secret: prepared.terminal.secret,
  };
  const [masterSession, operatorSession] = await Promise.all([
    posLogin(
      input,
      credentials.master.alias,
      credentials.master.pin,
      terminalCredentials,
    ),
    posLogin(
      input,
      credentials.operator.alias,
      credentials.operator.pin,
      terminalCredentials,
    ),
  ]);
  for (const session of [masterSession, operatorSession]) {
    if (
      session.terminal.id !== prepared.terminal.id ||
      session.terminal.branch.id !== prepared.terminal.branchId
    ) {
      fail("El login POS no quedó ligado a la terminal/sucursal preparada.");
    }
  }
  if (!masterSession.actor.isMaster || operatorSession.actor.isMaster) {
    fail("Los perfiles master/operador no conservan su separación esperada.");
  }
  if (
    !masterSession.permissions.includes("TERMINALS_MANAGE") ||
    operatorSession.permissions.includes("TERMINALS_MANAGE") ||
    !operatorSession.permissions.includes("SALE_CREATE")
  ) {
    fail("Los permisos master/operador no coinciden con el dataset sintético.");
  }

  const denied = await request<PosMasterAuthorizationDto>(
    input,
    "/api/pos/authorizations",
    json(
      "POST",
      { pin: "0000", purpose: PURPOSE },
      operatorSession.accessToken,
    ),
  );
  if (denied.status !== 403 || denied.body.success) {
    fail("El API no rechazó el código master incorrecto.");
  }
  const authorization = expectSuccess(
    await request<PosMasterAuthorizationDto>(
      input,
      "/api/pos/authorizations",
      json(
        "POST",
        { pin: credentials.master.pin, purpose: PURPOSE },
        operatorSession.accessToken,
      ),
    ),
    201,
    "Autorización mediante Código master",
  );
  const consumed = expectSuccess(
    await request<{ verified: boolean }>(
      input,
      "/api/pos/auth/verify",
      json(
        "POST",
        {
          authorizationToken: authorization.authorizationToken,
          purpose: PURPOSE,
        },
        operatorSession.accessToken,
      ),
    ),
    200,
    "Consumo de autorización",
  );
  if (!consumed.verified) fail("La autorización no quedó verificada.");

  console.log(
    JSON.stringify({
      result: "PASS",
      action: "verify",
      terminalStatus: "ACTIVE",
      branchMatches: true,
      masterPermissions: masterSession.permissions.length,
      operatorPermissions: operatorSession.permissions.length,
      wrongMasterCodeRejected: true,
      masterAuthorizationConsumed: true,
    }),
  );
}

async function main(): Promise<void> {
  const input = context();
  const credentials = loadDemoCredentials(input);
  if (input.command === "provision") await provision(input, credentials);
  else await verify(input, credentials);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Error desconocido";
  console.error(`RV10-P3: ${message}`);
  process.exitCode = 1;
});
