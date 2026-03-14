import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('exceljs')) {
            return 'excel-export'
          }

          if (id.includes('jspdf') || id.includes('jspdf-autotable')) {
            return 'pdf-export'
          }

          if (id.includes('recharts') || id.includes('d3-')) {
            return 'charts'
          }

          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'vendor-react'
          }

          if (id.includes('framer-motion') || id.includes('lucide-react') || id.includes('react-toastify')) {
            return 'vendor-ui'
          }

          if (id.includes('axios') || id.includes('@kurkle/color') || id.includes('clsx')) {
            return 'vendor-utils'
          }

          return 'vendor'
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['exceljs/dist/exceljs.min.js']
  }
})
