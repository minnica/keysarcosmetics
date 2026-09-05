import { chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const releaseComponents = [
  "envelope",
  "finance",
  "hr",
  "payroll",
  "scheduler",
  "api",
] as const;

export const productionReleaseComponents = [
  "envelope",
  "finance",
  "hr",
  "payroll",
  "scheduler",
  "api",
] as const;

export const frontendReleaseComponents = [
  "envelope",
  "finance",
  "hr",
  "payroll",
  "scheduler",
] as const;

export type FrontendReleaseComponent =
  (typeof frontendReleaseComponents)[number];

export const frontendReleasePaths: Record<FrontendReleaseComponent, string> = {
  envelope: "/login",
  finance: "/",
  hr: "/",
  payroll: "/login",
  scheduler: "/login",
};

export type ReleaseComponent = (typeof releaseComponents)[number];
export type ReleaseSet = Partial<Record<ReleaseComponent, string>>;

type ReleaseManifestOptions = {
  environment: string;
  releases: ReleaseSet;
  suiteSha?: string;
  verifiedAt?: string;
};

export type ReleaseManifest = {
  schemaVersion: 1;
  environment: string;
  verifiedAt: string;
  suiteSha: string | null;
  releases: ReleaseSet;
};

export function assertFullGitSha(value: string, name: string): void {
  if (!/^[a-f0-9]{40}$/i.test(value)) {
    throw new Error(`${name} debe contener un SHA completo de 40 caracteres.`);
  }
}

export function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Falta ${name}; configura el environment sin imprimir su valor.`,
    );
  }
  return value;
}

export function readExpectedReleases(prefix: "SMOKE" | "E2E"): ReleaseSet {
  const environment = requiredEnvironment("RELEASE_MANIFEST_ENVIRONMENT");
  const components =
    environment === "development"
      ? releaseComponents
      : productionReleaseComponents;
  const releases = Object.fromEntries(
    components.map((component) => {
      const variableName = `${prefix}_EXPECTED_${component.toUpperCase()}_SHA`;
      const value = requiredEnvironment(variableName);
      assertFullGitSha(value, variableName);
      return [component, value.toLowerCase()];
    }),
  ) as ReleaseSet;

  return releases;
}

export function assertReleaseIdentity(
  expected: ReleaseSet,
  actual: ReleaseSet,
): void {
  const expectedComponents = releaseComponents.filter(
    (component) => expected[component] !== undefined,
  );
  for (const component of expectedComponents) {
    const actualRelease = actual[component] ?? "";
    const expectedRelease = expected[component] ?? "";
    assertFullGitSha(actualRelease, `${component} release servido`);
    if (actualRelease.toLowerCase() !== expectedRelease.toLowerCase()) {
      throw new Error(
        `${component} sirve ${actualRelease}, pero el manifiesto declara ${expectedRelease}.`,
      );
    }
  }
}

export function createReleaseManifest({
  environment,
  releases,
  suiteSha,
  verifiedAt = new Date().toISOString(),
}: ReleaseManifestOptions): ReleaseManifest {
  const normalizedEnvironment = environment.trim();
  if (!normalizedEnvironment) {
    throw new Error("El ambiente del manifiesto es obligatorio.");
  }

  const components =
    normalizedEnvironment === "development"
      ? releaseComponents
      : productionReleaseComponents;
  for (const component of components) {
    assertFullGitSha(releases[component] ?? "", `${component} release`);
  }
  if (suiteSha) assertFullGitSha(suiteSha, "suiteSha");
  if (new Date(verifiedAt).toISOString() !== verifiedAt) {
    throw new Error("verifiedAt debe ser una fecha ISO UTC exacta.");
  }

  return {
    schemaVersion: 1,
    environment: normalizedEnvironment,
    verifiedAt,
    suiteSha: suiteSha?.toLowerCase() ?? null,
    releases: Object.fromEntries(
      components.map((component) => [
        component,
        (releases[component] ?? "").toLowerCase(),
      ]),
    ) as ReleaseSet,
  };
}

export async function writeVerifiedReleaseManifest(
  outputPath: string | undefined,
  options: ReleaseManifestOptions,
): Promise<void> {
  if (!outputPath?.trim()) return;

  const manifest = createReleaseManifest(options);
  const resolvedPath = path.resolve(outputPath);
  await mkdir(path.dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmod(resolvedPath, 0o600);
}
