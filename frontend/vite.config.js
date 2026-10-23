import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // In development the browser talks only to Vite; /api and /media are
  // forwarded to Django so cookies and CSRF behave as same-origin.
  const apiTarget = env.API_PROXY_TARGET || 'http://127.0.0.1:8000'

  return {
    plugins: [react(), tailwindcss()],
    build: {
      // Keep fonts as files: inlined data: URIs would be blocked by the
      // production Content-Security-Policy (font-src 'self').
      assetsInlineLimit: (filePath) => (/\.(woff2?|ttf|otf)$/.test(filePath) ? false : undefined),
    },
    server: {
      port: 5173,
      proxy: {
        '/api': { target: apiTarget },
        '/media': { target: apiTarget },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.js'],
      css: false,
      // Form tests type character by character; leave headroom on busy machines and CI.
      testTimeout: 15000,
    },
  }
})
