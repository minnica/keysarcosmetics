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
        gold: 'var(--color-gold)',
        nude: 'var(--color-nude)',
        charcoal: 'var(--color-charcoal)',
        ivory: 'var(--color-ivory)',
        'blue-brand-light': 'var(--color-blue-light)',
        'blue-brand-soft': 'var(--color-blue-soft)',
        'green-olive': 'var(--color-green-olive)',
        'green-sage': 'var(--color-green-sage)',
        'brand-bg': 'var(--bg-primary)',
        'brand-card': 'var(--bg-card)',
        'brand-sidebar': 'var(--bg-sidebar)',
        'brand-text': 'var(--text-primary)',
        'brand-muted': 'var(--text-muted)',
        'brand-accent': 'var(--accent)',
        'brand-border': 'var(--border-color)',
        background: 'var(--bg-primary)',
        foreground: 'var(--text-primary)',
        card: {
          DEFAULT: 'var(--bg-card)',
          foreground: 'var(--text-primary)',
        },
        popover: {
          DEFAULT: 'var(--bg-card)',
          foreground: 'var(--text-primary)',
        },
        primary: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--sidebar-active-text)',
        },
        secondary: {
          DEFAULT: 'var(--accent-hover)',
          foreground: 'var(--text-primary)',
        },
        muted: {
          DEFAULT: 'var(--accent-hover)',
          foreground: 'var(--text-muted)',
        },
        accent: {
          DEFAULT: 'var(--accent-hover)',
          foreground: 'var(--text-primary)',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        border: 'var(--border-color)',
        input: 'var(--border-color)',
        ring: 'var(--accent)',
        sidebar: {
          DEFAULT: 'var(--bg-sidebar)',
          foreground: 'var(--text-primary)',
          primary: 'var(--sidebar-active-bg)',
          'primary-foreground': 'var(--sidebar-active-text)',
          accent: 'var(--accent-hover)',
          'accent-foreground': 'var(--text-primary)',
          border: 'var(--border-color)',
          ring: 'var(--accent)',
        },
      },
      fontFamily: {
        sans: ['Gilroy', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        brand: ['Emofera Regular', 'Georgia', 'serif'],
      },
      boxShadow: {
        brand: 'var(--card-shadow)',
        'brand-md': '0 4px 16px rgba(195, 165, 131, 0.20)',
      },
      borderRadius: {
        brand: '10px',
      },
    },
  },
  plugins: [],
}

export default config
