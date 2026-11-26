import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Proxy (decisão D42): o navegador chama /api/... no próprio endereço do frontend e o
    // Vite repassa para o Flask. Assim o código não tem URL fixa da API.
    proxy: {
      '/api': 'http://127.0.0.1:5000',
    },
  },
  test: {
    // Vitest: roda os testes *.test.ts (só funções puras, sem navegador).
    include: ['src/**/*.test.ts'],
  },
})
