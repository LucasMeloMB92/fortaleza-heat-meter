// Hooks do TanStack Query: um por endpoint. Cada um guarda a resposta em cache usando a
// "chave" (queryKey) — pedir a mesma combinação de novo não chama a API outra vez.

import { useQuery } from '@tanstack/react-query'
import { api, type Modelo } from './api'

// /api/saude é consultada de tempos em tempos (e ao voltar para a aba): é ela que revela que
// o dia virou e os dados foram atualizados no servidor (D44). Ver App.tsx.
export const useSaude = () =>
  useQuery({
    queryKey: ['saude'],
    queryFn: api.saude,
    staleTime: 5 * 60_000, // 5 min
    refetchInterval: 15 * 60_000, // 15 min
    refetchOnWindowFocus: true,
  })

export const useOpcoes = () => useQuery({ queryKey: ['opcoes'], queryFn: api.opcoes })

// Sem "placeholderData": enquanto um modelo novo treina, a seção mostra "Treinando…" em vez
// do gráfico anterior — mostrar o anterior sob o título novo confundia (visto no teste da tela).
export const usePrevisao = (modelo: Modelo, horizonte: number) =>
  useQuery({
    queryKey: ['previsao', modelo, horizonte],
    queryFn: () => api.previsao(modelo, horizonte),
  })

export const useMetricas = () => useQuery({ queryKey: ['metricas'], queryFn: api.metricas })

export const useTeste = (modelo: Modelo) =>
  useQuery({
    queryKey: ['teste', modelo],
    queryFn: () => api.teste(modelo),
  })

// Caso de estudo com TODOS os modelos numa consulta só (D53): a tabela usa todos e o gráfico
// filtra o modelo escolhido. Trocar de modelo não chama a API de novo.
export const useCasoEstudo = () => useQuery({ queryKey: ['caso-estudo'], queryFn: api.casoEstudo })

// Comparação com anos anteriores (D50). Cálculo leve, sem parâmetros.
export const useContexto = () => useQuery({ queryKey: ['contexto'], queryFn: api.contexto })
