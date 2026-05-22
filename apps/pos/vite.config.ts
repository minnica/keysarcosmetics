// Configuración de Vite para la app POS (Electron + React)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Proceso principal de Electron
        entry: 'src/main/index.ts',
        onstart(options) {
          options.startup()
        },
        vite: {
          build: { outDir: 'dist-electron/main' },
        },
      },
      {
        // Script de preload
        entry: 'src/preload/index.ts',
        vite: {
          build: { outDir: 'dist-electron/preload' },
        },
      },
    ]),
    renderer(),
  ],
  server: { port: 3005 },
})
