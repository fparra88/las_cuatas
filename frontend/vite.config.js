import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Build sale a la carpeta que sirve el backend como estáticos.
  build: {
    outDir: '../backend/static',
    emptyOutDir: true,
  },
  // Dev: proxy /api al backend para no depender de URLs absolutas.
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
