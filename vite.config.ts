import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Only the production context (main branch) should be indexable — dev
// branch deploys and previews get a noindex tag + a blanket robots.txt.
const isProductionContext = process.env.CONTEXT === 'production'

function noindexNonProduction(): Plugin {
  return {
    name: 'noindex-non-production',
    transformIndexHtml(html) {
      if (isProductionContext) return html
      return html.replace(
        '<head>',
        '<head>\n    <meta name="robots" content="noindex, nofollow" />'
      )
    },
    closeBundle() {
      if (isProductionContext) return
      writeFileSync(resolve(process.cwd(), 'dist/robots.txt'), 'User-agent: *\nDisallow: /\n')
    },
  }
}

export default defineConfig({
  plugins: [react(), noindexNonProduction()],
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
