if (process.env.VERCEL_ENV === "production") throw new Error("El piloto de nómina requiere un deployment Preview.");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpila los paquetes del monorepo
  transpilePackages: ['@cosmetics/ui', '@cosmetics/types', '@cosmetics/auth', '@cosmetics/api-client'],
}

export default nextConfig
