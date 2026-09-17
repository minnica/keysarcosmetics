#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REQUIRED_NODE_VERSION = "22.23.2";
const REQUIRED_PNPM_VERSION = "10.0.0";

function fail(message) {
  throw new Error(message);
}

export function normalizedApiUrl(name, rawValue) {
  const value = rawValue?.trim();
  if (!value) fail(`${name} es obligatorio.`);

  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${name} debe ser una URL HTTP(S) absoluta.`);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    fail(`${name} debe usar http o https.`);
  }
  if (url.username || url.password || url.search || url.hash) {
    fail(`${name} no puede incluir credenciales, query ni fragmento.`);
  }
  if (url.pathname !== "/") {
    fail(`${name} debe apuntar al origen del API, sin path.`);
  }

  return url.origin;
}

export function validateConfiguration(environment = process.env) {
  if (environment.VITE_POS_DATA_MODE !== "api") {
    fail("VITE_POS_DATA_MODE debe ser api.");
  }
  if (environment.VITE_POS_VISUAL_FIXTURE === "1") {
    fail("VITE_POS_VISUAL_FIXTURE no puede estar habilitado en la demo API.");
  }

  const rendererApiUrl = normalizedApiUrl(
    "VITE_API_URL",
    environment.VITE_API_URL,
  );
  const mainApiUrl = normalizedApiUrl("POS_API_URL", environment.POS_API_URL);
  if (rendererApiUrl !== mainApiUrl) {
    fail("VITE_API_URL y POS_API_URL deben apuntar al mismo origen.");
  }

  const expectedSha = environment.POS_WINDOWS_EXPECTED_SHA?.trim();
  if (!/^[0-9a-f]{40}$/i.test(expectedSha ?? "")) {
    fail(
      "POS_WINDOWS_EXPECTED_SHA debe contener el SHA completo del candidato.",
    );
  }
  const terminalCode = environment.POS_TERMINAL_CODE?.trim();
  const terminalSecret = environment.POS_TERMINAL_SECRET?.trim();
  if (!terminalCode) {
    fail("POS_TERMINAL_CODE es obligatorio en el proceso principal.");
  }
  if (!terminalSecret) {
    fail("POS_TERMINAL_SECRET es obligatorio en el proceso principal.");
  }
  if (
    /^<[^>]+>$/.test(terminalCode) ||
    /^<[^>]+>$/.test(terminalSecret) ||
    terminalSecret === "provisionado-una-sola-vez-desde-la-api"
  ) {
    fail(
      "La terminal conserva placeholders; carga los valores privados reales.",
    );
  }

  return {
    apiUrl: mainApiUrl,
    expectedSha: expectedSha.toLowerCase(),
    rendererOrigin: normalizedApiUrl(
      "POS_WINDOWS_RENDERER_ORIGIN",
      environment.POS_WINDOWS_RENDERER_ORIGIN?.trim() ??
        "http://localhost:3005",
    ),
  };
}

function commandOutput(command, args) {
  return execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function validateLocalRuntime(configuration) {
  const nodeVersion = process.versions.node;
  if (nodeVersion !== REQUIRED_NODE_VERSION) {
    fail(
      `Node debe ser ${REQUIRED_NODE_VERSION}; versión actual: ${nodeVersion}.`,
    );
  }

  const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const pnpmVersion = commandOutput(pnpmCommand, ["--version"]);
  if (pnpmVersion !== REQUIRED_PNPM_VERSION) {
    fail(
      `pnpm debe ser ${REQUIRED_PNPM_VERSION}; versión actual: ${pnpmVersion}.`,
    );
  }

  const headSha = commandOutput("git", ["rev-parse", "HEAD"]).toLowerCase();
  if (headSha !== configuration.expectedSha) {
    fail("HEAD no coincide con POS_WINDOWS_EXPECTED_SHA.");
  }

  return { nodeVersion, pnpmVersion, headSha };
}

function timeoutSignal() {
  return AbortSignal.timeout(10_000);
}

async function jsonResponse(url, init) {
  const response = await fetch(url, { ...init, signal: timeoutSignal() });
  const body = await response.json().catch(() => null);
  return { response, body };
}

export async function probeApi(configuration) {
  const health = await jsonResponse(`${configuration.apiUrl}/health`);
  if (!health.response.ok || health.body?.status !== "ok") {
    fail("El API no respondió health=ok.");
  }
  if (health.body.release?.toLowerCase() !== configuration.expectedSha) {
    fail("health.release no coincide con el SHA del candidato.");
  }

  const readiness = await jsonResponse(`${configuration.apiUrl}/ready`);
  if (!readiness.response.ok || readiness.body?.status !== "ready") {
    fail("El API no respondió ready=ready.");
  }

  const preflight = await fetch(`${configuration.apiUrl}/api/pos/auth/login`, {
    method: "OPTIONS",
    headers: {
      Origin: configuration.rendererOrigin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
    signal: timeoutSignal(),
  });
  if (!preflight.ok) fail("El preflight CORS del login POS fue rechazado.");
  if (
    preflight.headers.get("access-control-allow-origin") !==
    configuration.rendererOrigin
  ) {
    fail("El API no autorizó el origin configurado para el renderer.");
  }

  return {
    release: health.body.release,
    ready: readiness.body.status,
    corsOrigin: configuration.rendererOrigin,
  };
}

function pass(message) {
  process.stdout.write(`[PASS] ${message}\n`);
}

async function main() {
  const action = process.argv[2] ?? "check";
  if (!["check", "probe"].includes(action)) {
    fail("Uso: node scripts/verify-pos-windows-demo.mjs <check|probe>");
  }

  const configuration = validateConfiguration();
  const runtime = validateLocalRuntime(configuration);
  pass(`Node ${runtime.nodeVersion} y pnpm ${runtime.pnpmVersion}.`);
  pass("HEAD coincide con el candidato configurado.");
  pass("Modo API y URLs renderer/main coinciden.");
  pass(
    "Terminal configurada sólo en el entorno del proceso (valores redactados).",
  );

  if (action === "probe") {
    const result = await probeApi(configuration);
    pass(`API lista, release ${result.release} y CORS ${result.corsOrigin}.`);
  }
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (invokedDirectly) {
  main().catch((error) => {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    process.stderr.write(`[FAIL] ${message}\n`);
    process.exitCode = 1;
  });
}

export const requirements = {
  node: REQUIRED_NODE_VERSION,
  pnpm: REQUIRED_PNPM_VERSION,
};
