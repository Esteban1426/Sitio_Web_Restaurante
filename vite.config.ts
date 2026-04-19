import { defineConfig, type Plugin } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

/** Dev-only proxy: obtiene imágenes remotas sin CORS para el puzzle (canvas). */
function puzzleImageProxyPlugin(): Plugin {
  return {
    name: 'puzzle-image-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url
        if (!url?.startsWith('/puzzle-image-proxy')) return next()
        try {
          const parsed = new URL(url, 'http://localhost')
          const target = parsed.searchParams.get('url')
          if (!target) {
            res.statusCode = 400
            res.end('missing url')
            return
          }
          let remote: URL
          try {
            remote = new URL(target)
          } catch {
            res.statusCode = 400
            res.end('invalid url')
            return
          }
          if (remote.protocol !== 'http:' && remote.protocol !== 'https:') {
            res.statusCode = 400
            res.end('invalid protocol')
            return
          }
          if (target.length > 2048) {
            res.statusCode = 400
            res.end('url too long')
            return
          }
          const upstream = await fetch(target, {
            redirect: 'follow',
            headers: { 'User-Agent': 'PrimeRare-PuzzleDevProxy/1.0' },
          })
          if (!upstream.ok) {
            res.statusCode = 502
            res.end('upstream error')
            return
          }
          const ct = upstream.headers.get('content-type') ?? 'application/octet-stream'
          if (!ct.startsWith('image/')) {
            res.statusCode = 400
            res.end('not an image')
            return
          }
          const buf = Buffer.from(await upstream.arrayBuffer())
          res.setHeader('Content-Type', ct)
          res.setHeader('Cache-Control', 'public, max-age=300')
          res.end(buf)
        } catch {
          res.statusCode = 500
          res.end('proxy error')
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    puzzleImageProxyPlugin(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
