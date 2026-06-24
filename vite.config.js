import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
