import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [react(), tailwindcss()],
  // Playwright runs must not hot-reload mid-test: HMR re-instantiates context modules and crashes open pages.
  server: process.env.PLAYWRIGHT_TEST_SERVER ? { watch: null, hmr: false } : undefined,
  build: {
    chunkSizeWarningLimit: 600,
  },
})
