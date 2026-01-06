import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      '@components': path.resolve(__dirname, 'components'),
    },
  },
  server: {
    fs: {
      allow: ['.', '..'],
    },
  },
});
