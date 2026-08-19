import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/xformcrm/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/xformcrm\/api/, '/api'),
      },
    },
  },
  build: {
    target: 'es2015',
    sourcemap: false,
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('country-state-city')) return 'vendor-location';
            if (id.includes('jspdf') || id.includes('pdf')) return 'vendor-pdf';
            if (id.includes('exceljs') || id.includes('xlsx')) return 'vendor-excel';
            if (id.includes('chart') || id.includes('recharts')) return 'vendor-charts';
            if (id.includes('@iconify') || id.includes('lucide')) return 'vendor-icons';
            if (id.includes('react') || id.includes('zustand') || id.includes('axios')) return 'vendor-react';
            return 'vendor-libs';
          }
        }
      }
    }
  },
})
