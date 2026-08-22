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
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('xlsx')) {
              return 'vendor-xlsx';
            }
            if (id.includes('jspdf')) {
              return 'vendor-jspdf';
            }
            if (id.includes('html2canvas') || id.includes('html2canvas-pro')) {
              return 'vendor-html2canvas';
            }
            if (id.includes('docx')) {
              return 'vendor-docx';
            }
            if (id.includes('@paddle/paddle-js')) {
              return 'vendor-paddle';
            }
            if (id.includes('papaparse')) {
              return 'vendor-papaparse';
            }
            return 'vendor-other';
          }
          if (id.includes('/components/ExportHubPage')) {
            return 'export-hub';
          }
          if (id.includes('/components/AdminPortal')) {
            return 'admin-portal';
          }
          if (id.includes('/components/AccountSettings')) {
            return 'account-settings';
          }
          if (id.includes('/components/LandingPage')) {
            return 'landing-page';
          }
          if (id.includes('/components/ClientProposalView')) {
            return 'client-proposal-view';
          }
        },
      },
    },
  },
})
