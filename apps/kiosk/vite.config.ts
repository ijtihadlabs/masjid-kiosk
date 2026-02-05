import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/admin': {
        target: 'http://localhost:5174',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => (path === '/admin' ? '/admin/' : path),
      },
      '/super-admin': {
        target: 'http://localhost:5175',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => (path === '/super-admin' ? '/super-admin/' : path),
      },
    },
  },
})
