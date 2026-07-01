import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/aman/',
  build: {
    assetsDir: 'static-assets',
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // 백엔드 API 요청 경로들만 명시적으로 백엔드로 프록시 처리
      '^/aman/(assets|auth|content|docs|folder|manual|admin/settings|health|history|user)': {
        target: 'http://localhost:8686',
        changeOrigin: true,
      },
    },
  },
})
