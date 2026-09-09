import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  assertReleaseIdentity,
  createReleaseManifest,
  writeVerifiedReleaseManifest,
  type ReleaseSet,
} from "./release-identity.ts";

const releases: ReleaseSet = {
  envelope: "1111111111111111111111111111111111111111",
  finance: "2222222222222222222222222222222222222222",
  hr: "3333333333333333333333333333333333333333",
  payroll: "4444444444444444444444444444444444444444",
  scheduler: "5555555555555555555555555555555555555555",
  api: "6666666666666666666666666666666666666666",
};

test("acepta una combinación multiversión exacta", () => {
  assert.doesNotThrow(() => assertReleaseIdentity(releases, releases));

  assert.deepEqual(
    createReleaseManifest({
      environment: "development",
      releases,
      suiteSha: "7777777777777777777777777777777777777777",
      verifiedAt: "2026-09-05T12:00:00.000Z",
    }),
    {
      schemaVersion: 1,
      environment: "development",
      verifiedAt: "2026-09-05T12:00:00.000Z",
      suiteSha: "7777777777777777777777777777777777777777",
      releases,
    },
  );
});

test("mantiene production en cinco frontends más API", () => {
  const manifest = createReleaseManifest({
    environment: "production",
    releases,
    verifiedAt: "2026-09-05T12:00:00.000Z",
  });
  assert.deepEqual(Object.keys(manifest.releases), [
    "envelope",
    "finance",
    "hr",
    "payroll",
    "scheduler",
    "api",
  ]);
});

test("rechaza cualquier alias diferente al SHA declarado", () => {
  assert.throws(
    () =>
      assertReleaseIdentity(releases, {
        ...releases,
        payroll: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      }),
    /payroll sirve a{40}, pero el manifiesto declara 4{40}/,
  );
});

test("rechaza SHAs abreviados o ambientes vacíos", () => {
  assert.throws(
    () =>
      createReleaseManifest({
        environment: "development",
        releases: { ...releases, scheduler: "abc123" },
      }),
    /SHA completo/,
  );
  assert.throws(
    () => createReleaseManifest({ environment: " ", releases }),
    /ambiente del manifiesto es obligatorio/,
  );
});

test("escribe un manifiesto auditable con permisos privados", async () => {
  const temporaryDirectory = await mkdtemp(
    path.join(os.tmpdir(), "keysar-release-manifest-"),
  );
  const outputPath = path.join(temporaryDirectory, "manifest.json");

  try {
    await writeVerifiedReleaseManifest(outputPath, {
      environment: "development",
      releases,
      verifiedAt: "2026-09-05T12:00:00.000Z",
    });

    const manifest = JSON.parse(await readFile(outputPath, "utf8"));
    assert.deepEqual(manifest.releases, releases);
    assert.equal((await stat(outputPath)).mode & 0o777, 0o600);
  } finally {
    await rm(temporaryDirectory, { recursive: true });
  }
});
