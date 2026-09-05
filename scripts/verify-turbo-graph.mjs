#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const FRONTEND_APPLICATION_PACKAGES = [
  "@cosmetics/landing",
  "@cosmetics/envelope",
  "@cosmetics/payroll",
  "@cosmetics/crm",
  "@cosmetics/scheduler",
  "@cosmetics/pos",
  "@cosmetics/finance",
  "@cosmetics/hr",
];

const DEPENDENCY_SECTIONS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
];

function run(command, arguments_) {
  return execFileSync(command, arguments_, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function sameValues(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function main() {
  const rootManifest = JSON.parse(readFileSync("package.json", "utf8"));
  const expectedTurboVersion = rootManifest.devDependencies?.turbo;
  const actualTurboVersion = run("pnpm", ["exec", "turbo", "--version"]).trim();

  if (actualTurboVersion !== expectedTurboVersion) {
    throw new Error(
      `Turbo instalado (${actualTurboVersion}) no coincide con package.json (${expectedTurboVersion})`,
    );
  }

  const workspaceList = ["apps", "packages", "backend"].flatMap((directory) =>
    readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.resolve(directory, entry.name))
      .filter((workspacePath) =>
        existsSync(path.join(workspacePath, "package.json")),
      )
      .map((workspacePath) => {
        const manifest = JSON.parse(
          readFileSync(path.join(workspacePath, "package.json"), "utf8"),
        );
        return { name: manifest.name, path: workspacePath };
      })
      .filter((workspace) => workspace.name?.startsWith("@cosmetics/")),
  );
  const manifests = new Map(
    workspaceList.map((workspace) => [
      workspace.name,
      JSON.parse(
        readFileSync(path.join(workspace.path, "package.json"), "utf8"),
      ),
    ]),
  );

  const internalPeerDependencies = [];
  for (const [packageName, manifest] of manifests) {
    for (const dependencyName of Object.keys(manifest.peerDependencies ?? {})) {
      if (manifests.has(dependencyName)) {
        internalPeerDependencies.push(`${packageName} -> ${dependencyName}`);
      }
    }
  }
  if (internalPeerDependencies.length > 0) {
    throw new Error(
      `Dependencias internas declaradas sólo como peerDependency no crean aristas ^build: ${internalPeerDependencies.join(", ")}`,
    );
  }

  const dryRun = JSON.parse(
    run("pnpm", ["exec", "turbo", "run", "build", "--dry=json"]),
  );
  const tasks = new Map(dryRun.tasks.map((task) => [task.taskId, task]));
  const mismatches = [];

  for (const [packageName, manifest] of manifests) {
    const taskId = `${packageName}#build`;
    const task = tasks.get(taskId);
    if (!task) {
      mismatches.push(`${taskId}: falta en el dry-run`);
      continue;
    }

    const expectedDependencies = new Set();
    for (const section of DEPENDENCY_SECTIONS) {
      for (const dependencyName of Object.keys(manifest[section] ?? {})) {
        if (manifests.has(dependencyName)) {
          expectedDependencies.add(`${dependencyName}#build`);
        }
      }
    }

    const expected = sorted(expectedDependencies);
    const actual = sorted(task.dependencies ?? []);
    if (!sameValues(actual, expected)) {
      mismatches.push(
        `${taskId}: esperado [${expected.join(", ")}], recibido [${actual.join(", ")}]`,
      );
    }
  }

  const requiredBuilds = [...FRONTEND_APPLICATION_PACKAGES, "@cosmetics/api"];
  for (const packageName of requiredBuilds) {
    if (!tasks.has(`${packageName}#build`)) {
      mismatches.push(`${packageName}#build: aplicación requerida ausente`);
    }
  }

  if (mismatches.length > 0) {
    throw new Error(
      `El grafo Turbo no coincide con los manifests:\n- ${mismatches.join("\n- ")}`,
    );
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        applicationsVerified: requiredBuilds.length,
        buildTasks: tasks.size,
        turboVersion: actualTurboVersion,
        workspaces: manifests.size,
      },
      null,
      2,
    )}\n`,
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR TURBO_GRAPH_MISMATCH: ${error.message}\n`);
  process.exitCode = 1;
}
