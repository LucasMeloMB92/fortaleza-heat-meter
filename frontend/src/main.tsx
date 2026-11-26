import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { LimiteDeErro } from './componentes/LimiteDeErro'
import './index.css'

// TanStack Query guarda as respostas da API em cache no navegador.
// staleTime: Infinity -> os dados só mudam quando o servidor atualiza (dia novo); nesse caso o
// App invalida as consultas (D44/D45). Exceção: /api/saude, que é reconsultada periodicamente.
const clienteConsultas = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity, retry: 1, refetchOnWindowFocus: false },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Última proteção: mesmo um erro inesperado no App mostra um aviso, nunca a tela branca. */}
    <LimiteDeErro titulo="A tela não pôde ser exibida. Recarregue a página ou tente de novo.">
      <QueryClientProvider client={clienteConsultas}>
        <App />
      </QueryClientProvider>
    </LimiteDeErro>
  </StrictMode>,
)
