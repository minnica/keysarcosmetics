/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  assetPrefix: "./",
  transpilePackages: ["@cosmetics/ui"],
};

export default nextConfig;
