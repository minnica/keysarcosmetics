import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-primary)',
        foreground: 'var(--text-primary)',
        card: {
          DEFAULT: '#ffffff',
          foreground: 'var(--text-primary)',
        },
        popover: {
          DEFAULT: '#fffdfb',
          foreground: 'var(--scheduler-ink-strong)',
        },
        primary: {
          DEFAULT: 'var(--scheduler-accent)',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: 'var(--scheduler-accent-soft)',
          foreground: 'var(--scheduler-ink-strong)',
        },
        muted: {
          DEFAULT: 'var(--scheduler-accent-soft)',
          foreground: '#64748b',
        },
        accent: {
          DEFAULT: 'var(--scheduler-accent-soft)',
          foreground: 'var(--scheduler-ink-strong)',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        border: 'var(--border-color)',
        input: 'var(--border-color)',
        ring: 'var(--scheduler-accent)',
        sidebar: {
          DEFAULT: 'var(--bg-sidebar)',
          foreground: 'var(--scheduler-ink-strong)',
          primary: 'var(--scheduler-accent)',
          'primary-foreground': '#ffffff',
          accent: 'var(--scheduler-accent-soft)',
          'accent-foreground': 'var(--scheduler-ink-strong)',
          border: 'var(--border-color)',
          ring: 'var(--scheduler-accent)',
        },
      },
    },
  },
  plugins: [],
}

export default config
