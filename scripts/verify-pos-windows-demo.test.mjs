import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizedApiUrl,
  validateConfiguration,
} from "./verify-pos-windows-demo.mjs";

const validEnvironment = {
  VITE_POS_DATA_MODE: "api",
  VITE_API_URL: "http://127.0.0.1:4000",
  POS_API_URL: "http://127.0.0.1:4000/",
  POS_TERMINAL_CODE: "terminal-redacted",
  POS_TERMINAL_SECRET: "secret-redacted",
  POS_WINDOWS_EXPECTED_SHA: "a".repeat(40),
};

test("acepta una configuración API coherente sin devolver secretos", () => {
  const result = validateConfiguration(validEnvironment);

  assert.deepEqual(result, {
    apiUrl: "http://127.0.0.1:4000",
    expectedSha: "a".repeat(40),
    rendererOrigin: "http://localhost:3005",
  });
  assert.equal(JSON.stringify(result).includes("secret-redacted"), false);
  assert.equal(JSON.stringify(result).includes("terminal-redacted"), false);
});

test("rechaza fixtures y URLs distintas", () => {
  assert.throws(
    () =>
      validateConfiguration({
        ...validEnvironment,
        VITE_POS_VISUAL_FIXTURE: "1",
      }),
    /VITE_POS_VISUAL_FIXTURE/,
  );
  assert.throws(
    () =>
      validateConfiguration({
        ...validEnvironment,
        POS_API_URL: "http://127.0.0.1:4001",
      }),
    /mismo origen/,
  );
});

test("rechaza secretos ausentes y SHA abreviado", () => {
  assert.throws(
    () =>
      validateConfiguration({ ...validEnvironment, POS_TERMINAL_SECRET: "" }),
    /POS_TERMINAL_SECRET/,
  );
  assert.throws(
    () =>
      validateConfiguration({
        ...validEnvironment,
        POS_WINDOWS_EXPECTED_SHA: "12fb804",
      }),
    /SHA completo/,
  );
  assert.throws(
    () =>
      validateConfiguration({
        ...validEnvironment,
        POS_TERMINAL_SECRET: "<capturar-en-la-sesion-privada>",
      }),
    /placeholders/,
  );
});

test("rechaza credenciales, paths y protocolos no HTTP en la URL", () => {
  assert.throws(
    () => normalizedApiUrl("POS_API_URL", "https://user:pass@example.com"),
    /credenciales/,
  );
  assert.throws(
    () => normalizedApiUrl("POS_API_URL", "https://example.com/api"),
    /sin path/,
  );
  assert.throws(
    () => normalizedApiUrl("POS_API_URL", "file:///tmp/api"),
    /http o https/,
  );
});
