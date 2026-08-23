import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-primary)",
        foreground: "var(--text-primary)",
        card: { DEFAULT: "var(--bg-card)", foreground: "var(--text-primary)" },
        popover: {
          DEFAULT: "var(--bg-popover)",
          foreground: "var(--text-primary)",
        },
        primary: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: { DEFAULT: "var(--muted)", foreground: "var(--text-muted)" },
        accent: {
          DEFAULT: "var(--accent-hover)",
          foreground: "var(--text-primary)",
        },
        destructive: { DEFAULT: "var(--destructive)", foreground: "#ffffff" },
        border: "var(--border-color)",
        input: "var(--input-border)",
        ring: "var(--accent)",
        sidebar: {
          DEFAULT: "var(--bg-sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-active-bg)",
          "primary-foreground": "var(--sidebar-active-text)",
          accent: "var(--sidebar-hover)",
          "accent-foreground": "var(--sidebar-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--accent)",
        },
      },
      fontFamily: {
        sans: ["Arial", "Helvetica", "sans-serif"],
        brand: ["Georgia", "Times New Roman", "serif"],
      },
      boxShadow: {
        brand: "var(--card-shadow)",
        "brand-md": "var(--dialog-shadow)",
      },
    },
  },
  plugins: [],
};

export default config;
