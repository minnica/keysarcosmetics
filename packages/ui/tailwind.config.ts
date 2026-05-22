import type { Config } from 'tailwindcss'

// Configuración base de Tailwind compartida por todas las apps
const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    // Las apps que consuman este paquete deben agregar esta ruta en su propio config:
    // '../../packages/ui/src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Paleta de marca — ajustar según identidad visual
        brand: {
          50:  '#fdf2f8',
          100: '#fce7f3',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          900: '#831843',
        },
      },
    },
  },
  plugins: [],
}

export default config
