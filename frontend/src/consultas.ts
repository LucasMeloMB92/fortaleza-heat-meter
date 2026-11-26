// Hooks do TanStack Query: um por endpoint. Cada um guarda a resposta em cache usando a
// "chave" (queryKey) — pedir a mesma combinação de novo não chama a API outra vez.

import { useQuery } from '@tanstack/react-query'
import { api, type Modelo, type Variavel } from './api'

export const useSaude = () => useQuery({ queryKey: ['saude'], queryFn: api.saude })

export const useOpcoes = () => useQuery({ queryKey: ['opcoes'], queryFn: api.opcoes })

export const useSerie = (variavel: Variavel, ativa = true) =>
  useQuery({ queryKey: ['serie', variavel], queryFn: () => api.serie(variavel), enabled: ativa })

// Sem "placeholderData": enquanto um modelo novo treina, a seção mostra "Treinando…" em vez
// do gráfico anterior — mostrar o anterior sob o título novo confundia (visto no teste da tela).
export const usePrevisao = (variavel: Variavel, modelo: Modelo, horizonte: number) =>
  useQuery({
    queryKey: ['previsao', variavel, modelo, horizonte],
    queryFn: () => api.previsao(variavel, modelo, horizonte),
  })

export const useMetricas = (variavel: Variavel) =>
  useQuery({
    queryKey: ['metricas', variavel],
    queryFn: () => api.metricas(variavel),
  })

export const useTeste = (variavel: Variavel, modelo: Modelo) =>
  useQuery({
    queryKey: ['teste', variavel, modelo],
    queryFn: () => api.teste(variavel, modelo),
  })

export const useCasoEstudo = (variavel: Variavel, modelo: Modelo) =>
  useQuery({
    queryKey: ['caso-estudo', variavel, modelo],
    queryFn: () => api.casoEstudo(variavel, modelo),
  })
