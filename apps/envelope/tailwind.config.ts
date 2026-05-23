import type { Config } from 'tailwindcss'

const config: Config = {
  // Dark mode activado por clase .dark en <html>
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta principal de marca
        gold:           'var(--color-gold)',
        nude:           'var(--color-nude)',
        charcoal:       'var(--color-charcoal)',
        ivory:          'var(--color-ivory)',
        // Paleta complementaria
        'blue-brand-light': 'var(--color-blue-light)',
        'blue-brand-soft':  'var(--color-blue-soft)',
        'green-olive':      'var(--color-green-olive)',
        'green-sage':       'var(--color-green-sage)',
        // Tokens semánticos
        'brand-bg':      'var(--bg-primary)',
        'brand-card':    'var(--bg-card)',
        'brand-sidebar': 'var(--bg-sidebar)',
        'brand-text':    'var(--text-primary)',
        'brand-muted':   'var(--text-muted)',
        'brand-accent':  'var(--accent)',
        'brand-border':  'var(--border-color)',
      },
      fontFamily: {
        sans:  ['Gilroy', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        brand: ['Emofera Regular', 'Georgia', 'serif'],
      },
      boxShadow: {
        'brand':    'var(--card-shadow)',
        'brand-md': '0 4px 16px rgba(195, 165, 131, 0.20)',
      },
      borderRadius: {
        'brand': '10px',
      },
    },
  },
  plugins: [],
}

export default config
