import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// TanStack Query guarda as respostas da API em cache no navegador.
// staleTime: Infinity -> os dados só mudam quando o servidor reinicia, então não há por que
// pedir de novo ao voltar para um modelo já visto (decisão D42).
const clienteConsultas = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity, retry: 1, refetchOnWindowFocus: false },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={clienteConsultas}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
