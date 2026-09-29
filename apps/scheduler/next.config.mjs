import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));

/** @param {string} phase */
export default function createNextConfig(phase) {
  const designMode = process.env.SCHEDULER_DESIGN_MODE === "1";
  if (designMode && process.env.VERCEL_ENV === "production") {
    throw new Error(
      "El entorno de diseño no puede desplegarse como producción.",
    );
  }
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    // Evita que `next build` sobrescriba los chunks usados por `next dev`.
    distDir: designMode
      ? phase === PHASE_DEVELOPMENT_SERVER
        ? ".next-design-dev"
        : ".next-design"
      : phase === PHASE_DEVELOPMENT_SERVER
        ? ".next-dev"
        : ".next",
    ...(designMode
      ? {
          env: { NEXT_PUBLIC_API_URL: "https://scheduler-design.invalid" },
          typescript: { tsconfigPath: "tsconfig.design.json" },
        }
      : {}),
    // Transpila los paquetes del monorepo
    transpilePackages: [
      "@cosmetics/ui",
      "@cosmetics/types",
      "@cosmetics/auth",
      "@cosmetics/api-client",
    ],
    webpack(config) {
      config.resolve.alias["@scheduler/runtime"] = path.join(
        directory,
        designMode ? "design/runtime.tsx" : "src/lib/runtime.tsx",
      );
      return config;
    },
  };

  return nextConfig;
}
