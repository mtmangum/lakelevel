import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // In dev, proxy /api/* directly to waterdatafortexas.org (CORS is server-side only)
    proxy: {
      '/api': {
        target: 'https://waterdatafortexas.org',
        changeOrigin: true,
        rewrite: path => {
          const qs = path.split('?')[1] ?? ''
          const p = new URLSearchParams(qs)
          return `/reservoirs/individual/${p.get('lake')}${p.get('suffix') ?? ''}.csv`
        },
      },
    },
  },
})
