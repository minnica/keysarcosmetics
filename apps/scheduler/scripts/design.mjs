import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const mode = process.argv[2];
if (!["dev", "build", "start"].includes(mode)) {
  throw new Error("Usa dev, build o start.");
}
if (process.env.VERCEL_ENV === "production") {
  throw new Error(
    "El entorno de diseño se ejecuta localmente o en un Preview separado.",
  );
}
const args = [require.resolve("next/dist/bin/next"), mode];
if (mode !== "build")
  args.push("-p", process.env.SCHEDULER_DESIGN_PORT ?? "3008");
args.push(...process.argv.slice(3));
const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    SCHEDULER_DESIGN_MODE: "1",
    NEXT_PUBLIC_API_URL: "https://scheduler-design.invalid",
  },
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code) => {
  if (mode === "build" && code === 0) {
    // Next resuelve también las referencias RSC a partir del tsconfig elegido.
    // Verificamos el artefacto final para detectar un runtime incorrecto.
    function sources(directory) {
      return readdirSync(directory, { withFileTypes: true }).flatMap(
        (entry) => {
          const file = path.join(directory, entry.name);
          return entry.isDirectory()
            ? sources(file)
            : file.endsWith(".js")
              ? [readFileSync(file, "utf8")]
              : [];
        },
      );
    }
    const chunks = sources(".next-design/static/chunks").join("\n");
    if (
      !chunks.includes("design-token-") ||
      !chunks.includes("scheduler-design.invalid")
    ) {
      process.stderr.write(
        "El build no contiene el runtime de diseño esperado.\n",
      );
      process.exit(1);
    }
  }
  process.exit(code ?? 1);
});
