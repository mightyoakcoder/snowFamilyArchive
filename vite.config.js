import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'client',                   // Vite looks for index.html here
  envDir: '..',                     // load .env from project root, not client/
  build: {
    outDir: '../dist',              // built output lands at project root /dist
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api/':  { target: 'http://localhost:8080', changeOrigin: true },
      '/proxy': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
