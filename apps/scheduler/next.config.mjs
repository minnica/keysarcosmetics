import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js'

/** @param {string} phase */
export default function createNextConfig(phase) {
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    // Evita que `next build` sobrescriba los chunks usados por `next dev`.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
    // Transpila los paquetes del monorepo
    transpilePackages: ['@cosmetics/ui', '@cosmetics/types', '@cosmetics/auth', '@cosmetics/api-client'],
  }

  return nextConfig
}
