import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.MEDSCAN_API_PROXY || 'http://127.0.0.1:5000'
  const proxy = {
    '/api': { target: apiTarget, changeOrigin: true, secure: false },
    '/health': { target: apiTarget, changeOrigin: true, secure: false },
  }
  return {
    plugins: [react(), tailwindcss()],
    server: { proxy },
    // Same as dev — without this, `npm run preview` serves the SPA but /api hits the preview server and 404s.
    preview: { proxy },
  }
})
