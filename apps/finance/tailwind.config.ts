import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-primary)', foreground: 'var(--text-primary)',
        card: { DEFAULT: 'var(--bg-card)', foreground: 'var(--text-primary)' },
        popover: { DEFAULT: 'var(--bg-card)', foreground: 'var(--text-primary)' },
        primary: { DEFAULT: 'var(--accent)', foreground: 'var(--sidebar-active-text)' },
        secondary: { DEFAULT: 'var(--accent-hover)', foreground: 'var(--text-primary)' },
        muted: { DEFAULT: 'var(--accent-hover)', foreground: 'var(--text-muted)' },
        accent: { DEFAULT: 'var(--accent-hover)', foreground: 'var(--text-primary)' },
        destructive: { DEFAULT: '#dc2626', foreground: '#ffffff' },
        border: 'var(--border-color)', input: 'var(--border-color)', ring: 'var(--accent)',
        sidebar: {
          DEFAULT: 'var(--bg-sidebar)', foreground: 'var(--finance-sidebar-muted)',
          primary: 'var(--sidebar-active-bg)', 'primary-foreground': 'var(--sidebar-active-text)',
          accent: 'var(--finance-sidebar-hover)', 'accent-foreground': '#ffffff',
          border: '#313951', ring: 'var(--accent)',
        },
      },
      fontFamily: { sans: ['Geist Finance', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: { brand: 'var(--card-shadow)', 'brand-md': '0 8px 24px rgba(30, 67, 55, 0.16)' },
    },
  },
  plugins: [],
};

export default config;
