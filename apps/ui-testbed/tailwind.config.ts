import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
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
          DEFAULT: "var(--accent-hover)",
          foreground: "var(--text-primary)",
        },
        muted: {
          DEFAULT: "var(--accent-hover)",
          foreground: "var(--text-muted)",
        },
        accent: {
          DEFAULT: "var(--accent-hover)",
          foreground: "var(--text-primary)",
        },
        destructive: { DEFAULT: "#b42318", foreground: "#ffffff" },
        border: "var(--border-color)",
        input: "var(--border-color)",
        ring: "var(--accent)",
        sidebar: {
          DEFAULT: "var(--bg-sidebar)",
          foreground: "var(--text-primary)",
          primary: "var(--sidebar-active-bg)",
          "primary-foreground": "#ffffff",
          accent: "var(--accent-hover)",
          "accent-foreground": "var(--text-primary)",
          border: "var(--border-color)",
          ring: "var(--accent)",
        },
      },
      boxShadow: {
        brand: "var(--card-shadow)",
        "brand-md": "0 4px 16px rgba(107, 79, 63, 0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
