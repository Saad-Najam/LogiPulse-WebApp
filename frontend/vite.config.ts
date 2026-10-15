import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND_URL = process.env.VITE_DEV_BACKEND_URL || 'http://localhost:3000'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 700,
  },
  server: {
    proxy: {
      '/api': { target: BACKEND_URL, changeOrigin: true },
      '/socket.io': { target: BACKEND_URL, changeOrigin: true, ws: true },
    },
  },
})
