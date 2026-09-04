import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/renderer/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-primary)",
        foreground: "var(--text-primary)",
        card: { DEFAULT: "var(--bg-card)", foreground: "var(--text-primary)" },
        popover: {
          DEFAULT: "var(--bg-card)",
          foreground: "var(--text-primary)",
        },
        primary: { DEFAULT: "var(--accent)", foreground: "#ffffff" },
        secondary: {
          DEFAULT: "var(--accent-soft)",
          foreground: "var(--text-primary)",
        },
        muted: {
          DEFAULT: "var(--accent-soft)",
          foreground: "var(--text-muted)",
        },
        accent: {
          DEFAULT: "var(--accent-soft)",
          foreground: "var(--text-primary)",
        },
        destructive: { DEFAULT: "#dc5d5d", foreground: "#ffffff" },
        border: "var(--border-color)",
        input: "var(--border-color)",
        ring: "var(--accent)",
      },
      fontFamily: {
        sans: ["Gilroy", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        brand: ["Emofera Regular", "Georgia", "serif"],
      },
      boxShadow: {
        "brand-md": "0 18px 45px rgba(78, 58, 45, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
