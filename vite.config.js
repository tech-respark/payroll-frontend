import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-table'],
  },
  server: {
    proxy: {
      '/payroll-management/v1': {
        target: 'https://localhost:8092',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
