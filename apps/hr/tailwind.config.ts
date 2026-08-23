import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: { extend: { fontFamily: { sans: ["DM Sans", "sans-serif"], brand: ["Playfair Display", "Georgia", "serif"] } } },
  plugins: [],
};

export default config;
