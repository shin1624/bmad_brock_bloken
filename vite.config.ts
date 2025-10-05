import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  define: {
    // Inject sanitized version at build time (only major.minor)
    __APP_VERSION__: JSON.stringify(
      process.env.npm_package_version?.split('.').slice(0, 2).join('.') || '1.0'
    ),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@game': path.resolve(__dirname, './src/game'),
      '@components': path.resolve(__dirname, './src/components'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})