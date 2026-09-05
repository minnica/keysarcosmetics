import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

export const VERCEL_APPLICATIONS = Object.freeze({
  landing: { packageName: "@cosmetics/landing", root: "apps/landing" },
  envelope: { packageName: "@cosmetics/envelope", root: "apps/envelope" },
  payroll: { packageName: "@cosmetics/payroll", root: "apps/payroll" },
  crm: { packageName: "@cosmetics/crm", root: "apps/crm" },
  scheduler: { packageName: "@cosmetics/scheduler", root: "apps/scheduler" },
  pos: { packageName: "@cosmetics/pos", root: "apps/pos" },
  finance: { packageName: "@cosmetics/finance", root: "apps/finance" },
  hr: { packageName: "@cosmetics/hr", root: "apps/hr" },
});

const GLOBAL_BUILD_FILES = new Set([
  ".nvmrc",
  "package.json",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "turbo.json",
]);

const LOCKFILE_PATH = "pnpm-lock.yaml";
const DEPENDENCY_SECTIONS = new Set([
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
]);

export class ImpactDetectorError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = "ImpactDetectorError";
    this.code = code;
    this.details = details;
  }
}

function normalizeRepositoryPath(filePath) {
  return filePath.replaceAll("\\", "/").replace(/^\.\//, "");
}

function parseJson(content, source) {
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new ImpactDetectorError(
      "INVALID_JSON",
      `No se pudo interpretar ${source}: ${error.message}`,
    );
  }
}

export function buildWorkspaceGraph(manifestEntries) {
  const nodesByName = new Map();
  const nodesByRoot = new Map();

  for (const entry of manifestEntries) {
    const manifestPath = normalizeRepositoryPath(entry.path);
    const root = path.posix.dirname(manifestPath);
    const manifest = parseJson(entry.content, manifestPath);

    if (typeof manifest.name !== "string" || manifest.name.length === 0) {
      throw new ImpactDetectorError(
        "INVALID_WORKSPACE_GRAPH",
        `${manifestPath} no declara un nombre de paquete válido`,
      );
    }
    if (nodesByName.has(manifest.name)) {
      throw new ImpactDetectorError(
        "INVALID_WORKSPACE_GRAPH",
        `El paquete ${manifest.name} está declarado más de una vez`,
      );
    }

    const declaredDependencies = new Set();
    for (const section of DEPENDENCY_SECTIONS) {
      const dependencies = manifest[section];
      if (dependencies === undefined) continue;
      if (dependencies === null || typeof dependencies !== "object") {
        throw new ImpactDetectorError(
          "INVALID_WORKSPACE_GRAPH",
          `${manifestPath} contiene ${section} inválidas`,
        );
      }
      for (const dependencyName of Object.keys(dependencies)) {
        declaredDependencies.add(dependencyName);
      }
    }

    const node = {
      dependencies: declaredDependencies,
      manifestPath,
      name: manifest.name,
      root,
    };
    nodesByName.set(node.name, node);
    nodesByRoot.set(node.root, node);
  }

  for (const node of nodesByName.values()) {
    node.workspaceDependencies = new Set();
    for (const dependencyName of node.dependencies) {
      if (nodesByName.has(dependencyName)) {
        node.workspaceDependencies.add(dependencyName);
      } else if (dependencyName.startsWith("@cosmetics/")) {
        throw new ImpactDetectorError(
          "INVALID_WORKSPACE_GRAPH",
          `${node.name} depende de ${dependencyName}, pero ese workspace no existe`,
        );
      }
    }
  }

  for (const [application, config] of Object.entries(VERCEL_APPLICATIONS)) {
    const node = nodesByRoot.get(config.root);
    if (node && node.name !== config.packageName) {
      throw new ImpactDetectorError(
        "INVALID_WORKSPACE_GRAPH",
        `${config.root} debe declarar ${config.packageName} para la aplicación ${application}`,
      );
    }
  }

  return { nodesByName, nodesByRoot };
}

function findWorkspaceForFile(graph, filePath) {
  const normalized = normalizeRepositoryPath(filePath);
  let match = null;
  for (const [root, node] of graph.nodesByRoot) {
    if (normalized === root || normalized.startsWith(`${root}/`)) {
      if (!match || root.length > match.root.length) match = node;
    }
  }
  return match;
}

export function workspaceAffectsApplication(graph, workspaceName, application) {
  const applicationConfig = VERCEL_APPLICATIONS[application];
  if (!applicationConfig) {
    throw new ImpactDetectorError(
      "UNKNOWN_APPLICATION",
      `Aplicación Vercel desconocida: ${application}`,
    );
  }

  const applicationNode = graph.nodesByRoot.get(applicationConfig.root);
  if (!applicationNode) {
    throw new ImpactDetectorError(
      "INVALID_WORKSPACE_GRAPH",
      `No existe ${applicationConfig.root}/package.json en el SHA objetivo`,
    );
  }
  if (!graph.nodesByName.has(workspaceName)) {
    throw new ImpactDetectorError(
      "INVALID_WORKSPACE_GRAPH",
      `El workspace afectado ${workspaceName} no existe en el SHA objetivo`,
    );
  }

  const pending = [applicationNode.name];
  const visited = new Set();
  while (pending.length > 0) {
    const currentName = pending.pop();
    if (currentName === workspaceName) return true;
    if (visited.has(currentName)) continue;
    visited.add(currentName);
    const current = graph.nodesByName.get(currentName);
    if (!current) {
      throw new ImpactDetectorError(
        "INVALID_WORKSPACE_GRAPH",
        `No se pudo resolver el workspace ${currentName}`,
      );
    }
    pending.push(...current.workspaceDependencies);
  }
  return false;
}

function isApplicationTestFile(filePath) {
  return (
    /\/(?:__tests__|tests?)\//.test(filePath) ||
    /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(filePath) ||
    /\/(?:playwright|vitest)\.config\.[cm]?[jt]s$/.test(filePath)
  );
}

function isExcludedRepositoryFile(filePath) {
  if (filePath === "CLAUDE.md") return true;
  if (filePath.startsWith("docs/")) return true;
  if (filePath.startsWith(".github/")) return true;
  if (filePath.startsWith("backend/api/")) return true;
  if (filePath.startsWith("apps/e2e/")) return true;
  if (filePath.startsWith("apps/ui-testbed/")) return true;
  if (
    /^scripts\/(?:audit-vercel-|collect-vercel-|detect-vercel-|inspect-vercel-|run-vercel-|vercel-|write-vercel-).*\.mjs$/.test(
      filePath,
    )
  )
    return true;
  if (/^[^/]+\.md$/i.test(filePath)) return true;
  return new Set([
    ".editorconfig",
    ".gitattributes",
    ".gitignore",
    ".prettierignore",
  ]).has(filePath);
}

export function classifyChangedFiles(changedFiles, graph) {
  const classification = {
    ambiguousFiles: [],
    excludedFiles: [],
    globalFiles: [],
    lockfileChanged: false,
    workspaceFiles: new Map(),
  };

  for (const rawFilePath of changedFiles) {
    const filePath = normalizeRepositoryPath(rawFilePath);
    if (!filePath || filePath.includes("\0")) {
      throw new ImpactDetectorError(
        "INVALID_GIT_DIFF",
        "Git devolvió una ruta inválida",
      );
    }

    if (filePath === LOCKFILE_PATH) {
      classification.lockfileChanged = true;
      continue;
    }
    if (GLOBAL_BUILD_FILES.has(filePath) || /^\.env(?:\..+)?$/.test(filePath)) {
      classification.globalFiles.push(filePath);
      continue;
    }
    if (isExcludedRepositoryFile(filePath)) {
      classification.excludedFiles.push(filePath);
      continue;
    }

    const workspace = findWorkspaceForFile(graph, filePath);
    if (workspace) {
      const application = Object.entries(VERCEL_APPLICATIONS).find(
        ([, config]) => config.root === workspace.root,
      )?.[0];
      if (application && isApplicationTestFile(filePath)) {
        classification.excludedFiles.push(filePath);
        continue;
      }
      if (workspace.root.startsWith("backend/")) {
        classification.excludedFiles.push(filePath);
        continue;
      }
      const files = classification.workspaceFiles.get(workspace.name) ?? [];
      files.push(filePath);
      classification.workspaceFiles.set(workspace.name, files);
      continue;
    }

    classification.ambiguousFiles.push(filePath);
  }

  for (const key of ["ambiguousFiles", "excludedFiles", "globalFiles"]) {
    classification[key].sort();
  }
  for (const files of classification.workspaceFiles.values()) files.sort();
  return classification;
}

function parseYamlScalar(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replaceAll("''", "'");
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      throw new ImpactDetectorError(
        "UNSUPPORTED_LOCKFILE",
        `Valor YAML entre comillas no reconocido: ${trimmed}`,
      );
    }
  }
  return trimmed;
}

function splitYamlKeyValue(line) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quote) {
      if (character === quote) {
        if (quote === "'" && line[index + 1] === "'") {
          index += 1;
        } else {
          quote = null;
        }
      } else if (quote === '"' && character === "\\") {
        index += 1;
      }
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === ":") {
      return [line.slice(0, index), line.slice(index + 1)];
    }
  }
  return null;
}

function indentation(line) {
  return line.length - line.trimStart().length;
}

function extractTopLevelEntries(lines, sectionName) {
  const sectionStart = lines.findIndex((line) => line === `${sectionName}:`);
  if (sectionStart < 0) {
    throw new ImpactDetectorError(
      "UNSUPPORTED_LOCKFILE",
      `pnpm-lock.yaml no contiene la sección ${sectionName}`,
    );
  }

  const entries = new Map();
  let current = null;
  for (let index = sectionStart + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.length > 0 && indentation(line) === 0) break;
    if (line.trim().length === 0) {
      if (current) current.lines.push(line);
      continue;
    }
    if (indentation(line) === 2) {
      const parts = splitYamlKeyValue(line.trim());
      if (!parts) {
        throw new ImpactDetectorError(
          "UNSUPPORTED_LOCKFILE",
          `Entrada no reconocida en ${sectionName}: ${line.trim()}`,
        );
      }
      const key = parseYamlScalar(parts[0]);
      if (entries.has(key)) {
        throw new ImpactDetectorError(
          "UNSUPPORTED_LOCKFILE",
          `Entrada duplicada ${key} en ${sectionName}`,
        );
      }
      current = { key, lines: [line] };
      entries.set(key, current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return entries;
}

function parseImporter(entry) {
  const dependencies = new Map();
  let dependencySection = null;
  let dependencyName = null;

  for (const line of entry.lines.slice(1)) {
    if (line.trim().length === 0) continue;
    const level = indentation(line);
    if (level === 4) {
      const parts = splitYamlKeyValue(line.trim());
      dependencySection =
        parts && DEPENDENCY_SECTIONS.has(parseYamlScalar(parts[0]))
          ? parseYamlScalar(parts[0])
          : null;
      dependencyName = null;
      continue;
    }
    if (!dependencySection) continue;
    if (level === 6) {
      const parts = splitYamlKeyValue(line.trim());
      if (!parts) {
        throw new ImpactDetectorError(
          "UNSUPPORTED_LOCKFILE",
          `Dependencia no reconocida en el importador ${entry.key}`,
        );
      }
      dependencyName = parseYamlScalar(parts[0]);
      continue;
    }
    if (level === 8 && dependencyName) {
      const parts = splitYamlKeyValue(line.trim());
      if (parts && parseYamlScalar(parts[0]) === "version") {
        dependencies.set(dependencyName, parseYamlScalar(parts[1]));
      }
    }
  }
  return dependencies;
}

function parseSnapshotDependencies(entry) {
  const dependencies = new Map();
  let dependencySection = false;
  for (const line of entry.lines.slice(1)) {
    if (line.trim().length === 0) continue;
    const level = indentation(line);
    if (level === 4) {
      const parts = splitYamlKeyValue(line.trim());
      const key = parts ? parseYamlScalar(parts[0]) : "";
      dependencySection =
        key === "dependencies" || key === "optionalDependencies";
      continue;
    }
    if (dependencySection && level === 6) {
      const parts = splitYamlKeyValue(line.trim());
      if (!parts || parts[1].trim().length === 0) {
        throw new ImpactDetectorError(
          "UNSUPPORTED_LOCKFILE",
          `Dependencia transitiva no reconocida en ${entry.key}`,
        );
      }
      dependencies.set(parseYamlScalar(parts[0]), parseYamlScalar(parts[1]));
    }
  }
  return dependencies;
}

export function parsePnpmLockfile(content) {
  const versionMatch = content.match(
    /^lockfileVersion:\s*['"]?([^'"\n]+)['"]?\s*$/m,
  );
  if (!versionMatch || versionMatch[1] !== "9.0") {
    throw new ImpactDetectorError(
      "UNSUPPORTED_LOCKFILE",
      `Sólo se admite pnpm-lock.yaml v9.0; versión encontrada: ${versionMatch?.[1] ?? "ninguna"}`,
    );
  }

  const lines = content.replaceAll("\r\n", "\n").split("\n");
  const importerEntries = extractTopLevelEntries(lines, "importers");
  const packageEntries = extractTopLevelEntries(lines, "packages");
  const snapshotEntries = extractTopLevelEntries(lines, "snapshots");

  return {
    importers: new Map(
      [...importerEntries].map(([key, entry]) => [
        key,
        { dependencies: parseImporter(entry), raw: entry.lines.join("\n") },
      ]),
    ),
    packages: new Map(
      [...packageEntries].map(([key, entry]) => [key, entry.lines.join("\n")]),
    ),
    snapshots: new Map(
      [...snapshotEntries].map(([key, entry]) => [
        key,
        {
          dependencies: parseSnapshotDependencies(entry),
          raw: entry.lines.join("\n"),
        },
      ]),
    ),
  };
}

function packageKeyWithoutPeerContext(snapshotKey) {
  const versionSeparator = snapshotKey.startsWith("@")
    ? snapshotKey.indexOf("@", 1 + snapshotKey.indexOf("/"))
    : snapshotKey.indexOf("@");
  const peerStart = snapshotKey.indexOf("(", versionSeparator + 1);
  return peerStart < 0 ? snapshotKey : snapshotKey.slice(0, peerStart);
}

function resolveSnapshotKey(lockfile, dependencyName, reference) {
  if (
    reference.startsWith("link:") ||
    reference.startsWith("workspace:") ||
    reference.startsWith("file:")
  ) {
    return null;
  }

  let packageName = dependencyName;
  let version = reference.replace(/^\//, "");
  if (version.startsWith("npm:")) {
    const alias = version.slice(4);
    const separator = alias.lastIndexOf("@");
    if (separator <= 0) {
      throw new ImpactDetectorError(
        "LOCKFILE_AMBIGUOUS",
        `Alias npm no reconocido para ${dependencyName}: ${reference}`,
      );
    }
    packageName = alias.slice(0, separator);
    version = alias.slice(separator + 1);
  }

  const exact = `${packageName}@${version}`;
  if (lockfile.snapshots.has(exact)) return exact;
  if (lockfile.snapshots.has(version)) return version;
  const candidates = [...lockfile.snapshots.keys()].filter((key) =>
    key.startsWith(`${exact}(`),
  );
  if (candidates.length === 1) return candidates[0];
  throw new ImpactDetectorError(
    "LOCKFILE_AMBIGUOUS",
    `No se pudo resolver ${dependencyName}@${reference} de forma única`,
    { candidates },
  );
}

function importerFingerprint(lockfile, importerName) {
  const importer = lockfile.importers.get(importerName);
  if (!importer) return null;
  const visited = new Set();
  const pending = [...importer.dependencies];

  while (pending.length > 0) {
    const [dependencyName, reference] = pending.pop();
    const snapshotKey = resolveSnapshotKey(lockfile, dependencyName, reference);
    if (!snapshotKey || visited.has(snapshotKey)) continue;
    visited.add(snapshotKey);
    const snapshot = lockfile.snapshots.get(snapshotKey);
    if (!snapshot) {
      throw new ImpactDetectorError(
        "LOCKFILE_AMBIGUOUS",
        `Falta el snapshot ${snapshotKey}`,
      );
    }
    pending.push(...snapshot.dependencies);
  }

  const closure = [...visited].sort().map((snapshotKey) => {
    const snapshot = lockfile.snapshots.get(snapshotKey);
    const packageKey = packageKeyWithoutPeerContext(snapshotKey);
    const packageEntry = lockfile.packages.get(packageKey);
    if (!packageEntry) {
      throw new ImpactDetectorError(
        "LOCKFILE_AMBIGUOUS",
        `Falta la entrada packages para ${snapshotKey}`,
      );
    }
    return `${snapshotKey}\n${packageEntry}\n${snapshot.raw}`;
  });
  return `${importer.raw}\n${closure.join("\n")}`;
}

export function analyzeLockfileImpact(baseContent, targetContent) {
  if (baseContent === targetContent) {
    return { changedImporters: [], rootImporterChanged: false };
  }

  const base = parsePnpmLockfile(baseContent);
  const target = parsePnpmLockfile(targetContent);
  const importerNames = new Set([
    ...base.importers.keys(),
    ...target.importers.keys(),
  ]);
  const changedImporters = [];
  let rootImporterChanged = false;

  for (const importerName of [...importerNames].sort()) {
    const baseFingerprint = importerFingerprint(base, importerName);
    const targetFingerprint = importerFingerprint(target, importerName);
    if (baseFingerprint === targetFingerprint) continue;
    if (importerName === ".") rootImporterChanged = true;
    else changedImporters.push(importerName);
  }

  if (!rootImporterChanged && changedImporters.length === 0) {
    throw new ImpactDetectorError(
      "LOCKFILE_AMBIGUOUS",
      "El lockfile cambió, pero no fue posible atribuir el cambio a un importador",
    );
  }
  return { changedImporters, rootImporterChanged };
}

function groupReason(code, message, files, extra = undefined) {
  return {
    code,
    message,
    files: [...new Set(files)].sort(),
    ...(extra ?? {}),
  };
}

export function evaluateApplicationImpact({
  application,
  baseSha,
  branch,
  changedFiles,
  environment,
  graph,
  lockfileImpact,
  targetSha,
}) {
  const config = VERCEL_APPLICATIONS[application];
  if (!config) {
    throw new ImpactDetectorError(
      "UNKNOWN_APPLICATION",
      `Aplicación Vercel desconocida: ${application}`,
    );
  }
  const expectedBranch = environment === "development" ? "develop" : "master";
  if (branch !== expectedBranch) {
    return {
      affected: false,
      application,
      baseSha,
      package: config.packageName,
      reasons: [
        groupReason(
          "branch-not-deployable",
          `La rama ${branch} no publica frontends en ${environment}; se requiere ${expectedBranch}`,
          [],
        ),
      ],
      targetSha,
    };
  }

  const classification = classifyChangedFiles(changedFiles, graph);
  if (classification.ambiguousFiles.length > 0) {
    throw new ImpactDetectorError(
      "AMBIGUOUS_FILE_SCOPE",
      "Hay archivos cuyo impacto no está definido; el detector se cierra de forma conservadora",
      { files: classification.ambiguousFiles },
    );
  }
  if (
    classification.lockfileChanged &&
    !lockfileImpact.rootImporterChanged &&
    lockfileImpact.changedImporters.length === 0
  ) {
    throw new ImpactDetectorError(
      "LOCKFILE_AMBIGUOUS",
      "pnpm-lock.yaml cambió sin evidencia de importadores afectados",
    );
  }

  const reasons = [];
  let affected = false;
  if (
    classification.globalFiles.length > 0 ||
    lockfileImpact.rootImporterChanged
  ) {
    affected = true;
    reasons.push(
      groupReason(
        "global-build-configuration",
        "Cambió configuración global que participa en todos los builds frontend",
        [
          ...classification.globalFiles,
          ...(lockfileImpact.rootImporterChanged ? [LOCKFILE_PATH] : []),
        ],
      ),
    );
  }

  for (const [workspaceName, files] of classification.workspaceFiles) {
    if (!workspaceAffectsApplication(graph, workspaceName, application))
      continue;
    affected = true;
    const workspace = graph.nodesByName.get(workspaceName);
    reasons.push(
      groupReason(
        workspace.root === config.root
          ? "direct-application-change"
          : "workspace-dependency-change",
        workspace.root === config.root
          ? `Cambió directamente ${application}`
          : `${config.packageName} consume transitivamente ${workspaceName}`,
        files,
        { workspace: workspaceName },
      ),
    );
  }

  for (const importerRoot of lockfileImpact.changedImporters) {
    const workspace = graph.nodesByRoot.get(importerRoot);
    if (!workspace) {
      throw new ImpactDetectorError(
        "LOCKFILE_AMBIGUOUS",
        `El lockfile atribuye cambios a ${importerRoot}, que no existe en el grafo objetivo`,
      );
    }
    if (!workspaceAffectsApplication(graph, workspace.name, application))
      continue;
    affected = true;
    reasons.push(
      groupReason(
        "lockfile-dependency-change",
        `El cierre de dependencias de ${workspace.name} cambió en el lockfile`,
        [LOCKFILE_PATH],
        { workspace: workspace.name },
      ),
    );
  }

  if (classification.excludedFiles.length > 0) {
    reasons.push(
      groupReason(
        "excluded-change",
        "Estos archivos están excluidos de deployments frontend por política",
        classification.excludedFiles,
      ),
    );
  }
  if (!affected) {
    const unrelatedFiles = [];
    for (const files of classification.workspaceFiles.values())
      unrelatedFiles.push(...files);
    reasons.push(
      groupReason(
        "no-impacting-change",
        `${config.packageName} no consume ninguno de los workspaces modificados`,
        unrelatedFiles,
      ),
    );
  }

  return {
    affected,
    application,
    baseSha,
    package: config.packageName,
    reasons,
    targetSha,
  };
}

export function resolveLastSuccessfulBase(state, environment, application) {
  const entries = state?.environments?.[environment]?.[application];
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new ImpactDetectorError(
      "MISSING_DEPLOYMENT_BASE",
      `No existe historial de deployments para ${application} en ${environment}`,
    );
  }

  let previousTimestamp = Number.POSITIVE_INFINITY;
  for (const entry of entries) {
    if (
      !entry ||
      typeof entry.sha !== "string" ||
      typeof entry.status !== "string" ||
      typeof entry.createdAt !== "string"
    ) {
      throw new ImpactDetectorError(
        "INVALID_DEPLOYMENT_STATE",
        `El historial de ${application} contiene una entrada incompleta`,
      );
    }
    const timestamp = Date.parse(entry.createdAt);
    if (!Number.isFinite(timestamp) || timestamp > previousTimestamp) {
      throw new ImpactDetectorError(
        "INVALID_DEPLOYMENT_STATE",
        `El historial de ${application} debe estar ordenado del más reciente al más antiguo`,
      );
    }
    previousTimestamp = timestamp;
    if (entry.status === "READY") return entry.sha;
  }

  throw new ImpactDetectorError(
    "MISSING_DEPLOYMENT_BASE",
    `No existe un deployment READY para ${application} en ${environment}`,
  );
}

function runGit(repositoryRoot, args, options = {}) {
  try {
    return execFileSync("git", args, {
      cwd: repositoryRoot,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });
  } catch (error) {
    const stderr = typeof error.stderr === "string" ? error.stderr.trim() : "";
    throw new ImpactDetectorError(
      "GIT_HISTORY_UNAVAILABLE",
      stderr || `Git no pudo ejecutar: git ${args.join(" ")}`,
    );
  }
}

export function createGitRepository(repositoryRoot) {
  const root = path.resolve(repositoryRoot);
  return {
    assertAncestor(baseSha, targetSha) {
      try {
        execFileSync(
          "git",
          ["merge-base", "--is-ancestor", baseSha, targetSha],
          {
            cwd: root,
            stdio: "ignore",
          },
        );
      } catch {
        throw new ImpactDetectorError(
          "GIT_HISTORY_INSUFFICIENT",
          `${baseSha} no es un ancestro disponible de ${targetSha}; haga checkout con historia completa`,
        );
      }
    },
    changedFiles(baseSha, targetSha) {
      const output = runGit(root, [
        "diff",
        "--name-only",
        "-z",
        baseSha,
        targetSha,
        "--",
      ]);
      return output.split("\0").filter(Boolean);
    },
    fileAt(sha, filePath) {
      return runGit(root, ["show", `${sha}:${filePath}`]);
    },
    manifestsAt(sha) {
      const files = runGit(root, ["ls-tree", "-r", "--name-only", sha, "--"])
        .split("\n")
        .filter((filePath) =>
          /^(?:apps|packages|backend)\/[^/]+\/package\.json$/.test(filePath),
        );
      if (files.length === 0) {
        throw new ImpactDetectorError(
          "INVALID_WORKSPACE_GRAPH",
          `No se encontraron manifests de workspaces en ${sha}`,
        );
      }
      return files.map((filePath) => ({
        path: filePath,
        content: this.fileAt(sha, filePath),
      }));
    },
    resolveCommit(reference) {
      try {
        const output = runGit(root, [
          "rev-parse",
          "--verify",
          "--end-of-options",
          `${reference}^{commit}`,
        ]);
        return output.trim();
      } catch {
        throw new ImpactDetectorError(
          "GIT_HISTORY_INSUFFICIENT",
          `El commit ${reference} no está disponible; haga checkout con historia completa`,
        );
      }
    },
    root,
  };
}

export function loadDeploymentState(filePath) {
  let content;
  try {
    content = readFileSync(filePath, "utf8");
  } catch (error) {
    throw new ImpactDetectorError(
      "INVALID_DEPLOYMENT_STATE",
      `No se pudo leer ${filePath}: ${error.message}`,
    );
  }
  return parseJson(content, filePath);
}

export function detectVercelImpact({
  applications,
  baseSha,
  branch,
  deploymentState,
  environment,
  repository,
  targetSha,
}) {
  if (!["development", "production"].includes(environment)) {
    throw new ImpactDetectorError(
      "INVALID_ENVIRONMENT",
      "El ambiente debe ser development o production",
    );
  }
  if (!Array.isArray(applications) || applications.length === 0) {
    throw new ImpactDetectorError(
      "UNKNOWN_APPLICATION",
      "Debe indicarse al menos una aplicación",
    );
  }
  for (const application of applications) {
    if (!VERCEL_APPLICATIONS[application]) {
      throw new ImpactDetectorError(
        "UNKNOWN_APPLICATION",
        `Aplicación Vercel desconocida: ${application}`,
      );
    }
  }

  const resolvedTargetSha = repository.resolveCommit(targetSha);
  const expectedBranch = environment === "development" ? "develop" : "master";
  if (branch !== expectedBranch) {
    const results = applications.map((application) =>
      evaluateApplicationImpact({
        application,
        baseSha: null,
        branch,
        changedFiles: [],
        environment,
        graph: { nodesByName: new Map(), nodesByRoot: new Map() },
        lockfileImpact: { changedImporters: [], rootImporterChanged: false },
        targetSha: resolvedTargetSha,
      }),
    );
    return buildDetectionOutput({
      branch,
      environment,
      results,
      targetSha: resolvedTargetSha,
    });
  }

  const graph = buildWorkspaceGraph(repository.manifestsAt(resolvedTargetSha));
  const analysisByBase = new Map();
  const results = [];
  for (const application of applications) {
    const rawBase =
      baseSha ??
      resolveLastSuccessfulBase(deploymentState, environment, application);
    const resolvedBaseSha = repository.resolveCommit(rawBase);
    repository.assertAncestor(resolvedBaseSha, resolvedTargetSha);
    let analysis = analysisByBase.get(resolvedBaseSha);
    if (!analysis) {
      const changedFiles = repository.changedFiles(
        resolvedBaseSha,
        resolvedTargetSha,
      );
      let lockfileImpact = { changedImporters: [], rootImporterChanged: false };
      if (changedFiles.includes(LOCKFILE_PATH)) {
        lockfileImpact = analyzeLockfileImpact(
          repository.fileAt(resolvedBaseSha, LOCKFILE_PATH),
          repository.fileAt(resolvedTargetSha, LOCKFILE_PATH),
        );
      }
      analysis = { changedFiles, lockfileImpact };
      analysisByBase.set(resolvedBaseSha, analysis);
    }
    results.push(
      evaluateApplicationImpact({
        application,
        baseSha: resolvedBaseSha,
        branch,
        changedFiles: analysis.changedFiles,
        environment,
        graph,
        lockfileImpact: analysis.lockfileImpact,
        targetSha: resolvedTargetSha,
      }),
    );
  }

  return buildDetectionOutput({
    branch,
    environment,
    results,
    targetSha: resolvedTargetSha,
  });
}

function buildDetectionOutput({ branch, environment, results, targetSha }) {
  return {
    schemaVersion: 1,
    status: "ok",
    mode: "diagnostic",
    environment,
    branch,
    targetSha,
    affectedApplications: results
      .filter((result) => result.affected)
      .map((result) => result.application),
    skippedApplications: results
      .filter((result) => !result.affected)
      .map((result) => result.application),
    results,
  };
}

export function formatHumanSummary(output) {
  const lines = [
    `Detector Vercel (diagnóstico) — ${output.environment}/${output.branch}`,
    `SHA objetivo: ${output.targetSha}`,
  ];
  for (const result of output.results) {
    lines.push(
      `${result.affected ? "AFECTADA" : "OMITIDA"} ${result.application} ` +
        `(base ${result.baseSha ?? "no aplica"})`,
    );
    for (const reason of result.reasons) {
      lines.push(`  - ${reason.message}`);
      if (reason.files.length > 0)
        lines.push(`    archivos: ${reason.files.join(", ")}`);
    }
  }
  lines.push(
    `Total: ${output.affectedApplications.length} afectadas, ` +
      `${output.skippedApplications.length} omitidas`,
  );
  return lines.join("\n");
}

export function formatDetectorError(error) {
  const normalized =
    error instanceof ImpactDetectorError
      ? error
      : new ImpactDetectorError(
          "UNEXPECTED_ERROR",
          error?.message ?? String(error),
        );
  return {
    schemaVersion: 1,
    status: "error",
    mode: "diagnostic",
    error: {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details === undefined
        ? {}
        : { details: normalized.details }),
    },
  };
}
