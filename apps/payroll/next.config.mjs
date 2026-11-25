const standalone =
  process.env.PILOT_STANDALONE_PROJECT === "prj_63u3umjnK9xfXtrawKDuW7USsKWE" &&
  process.env.PILOT_API_ORIGIN === "https://cosmetics-payroll-pilot.fly.dev" &&
  process.env.VERCEL_GIT_COMMIT_REF === "pilot/payroll-v2";
if (process.env.VERCEL_ENV === "production" && !standalone)
  throw new Error(
    "Esta rama sólo se publica en el proyecto independiente del piloto o en Preview.",
  );

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpila los paquetes del monorepo
  transpilePackages: [
    "@cosmetics/ui",
    "@cosmetics/types",
    "@cosmetics/auth",
    "@cosmetics/api-client",
  ],
};

export default nextConfig;
