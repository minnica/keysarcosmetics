/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpila los paquetes del monorepo
  transpilePackages: ['@cosmetics/ui', '@cosmetics/types', '@cosmetics/auth', '@cosmetics/api-client'],
}

export default nextConfig
