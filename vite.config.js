import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@knowledge': fileURLToPath(new URL('./src/apps/knowledge', import.meta.url)),
      '@quiz': fileURLToPath(new URL('./src/apps/quiz', import.meta.url)),
      '@architecture': fileURLToPath(new URL('./src/apps/architecture', import.meta.url)),
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
  },
})
