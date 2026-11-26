// Ranking geral dos modelos: junta as métricas das DUAS variáveis (temperatura e sensação) numa
// tabela só. Funções puras (só contas, nenhum texto): testadas em ranking.test.ts.
// As frases sobre o ranking ficam em textos.ts (regra D46: toda frase da tela vem de lá).
import type { LinhaMetricas, Modelo, RespostaMetricas } from './api'

/** Como o modelo se saiu contra a regra simples numa variável (mesmo limite de 3% da D46). */
export type VsRegra = 'regua' | 'melhor' | 'empate' | 'pior'

export function classificarVsRegra(linha: LinhaMetricas): VsRegra {
  if (linha.modelo === 'linha_base') return 'regua'
  const pct = linha.mae_vs_linha_base ?? 0
  if (pct <= -3) return 'melhor'
  if (pct >= 3) return 'pior'
  return 'empate'
}

/**
 * Arredonda para 2 casas, com o "meio" para cima, como se faz à mão: 0,335 -> 0,34.
 * Por quê: a média de dois números de 2 casas cai muitas vezes no meio (0,38 e 0,29 -> 0,335),
 * e o computador guarda 0,335 como 0,33499999…, o que faria a tela mostrar 0,33 e o relatório
 * 0,34. O "Number.EPSILON" (o menor número que o computador distingue) corrige esse resto.
 */
export const arredondar2 = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100

/** Um modelo numa variável: posição (1 = menor erro) e as métricas daquela variável. */
export interface DesempenhoVariavel {
  posicao: number
  linha: LinhaMetricas
  vsRegra: VsRegra
}

export interface LinhaRanking {
  modelo: Modelo
  nome: string
  posicaoGeral: number
  temperatura: DesempenhoVariavel
  sensacao: DesempenhoVariavel
  posicaoMedia: number // média das duas posições: menor = mais regular
  erroMedio: number // média simples dos dois erros médios (MAE), já com 2 casas (arredondar2)
  larguraMedia: number | null // média das duas larguras de faixa (D48); null se a API não mandou
}

/**
 * Posição de cada modelo numa variável: menor erro médio (MAE) primeiro.
 * Empate no MAE (a API manda 2 casas) -> desempata o "vs regra simples", que vem do MAE sem
 * arredondar e por isso separa modelos que empatam nas 2 casas.
 */
export function posicoes(resposta: RespostaMetricas): Map<Modelo, number> {
  const ordenadas = [...resposta.metricas].sort(
    (a, b) =>
      (a.mae ?? Infinity) - (b.mae ?? Infinity) ||
      (a.mae_vs_linha_base ?? 0) - (b.mae_vs_linha_base ?? 0),
  )
  return new Map(ordenadas.map((l, i) => [l.modelo, i + 1]))
}

/**
 * Monta o ranking geral. Critério (ver relatório, seção 7.2): menor posição média nas duas
 * variáveis; empate na posição média -> menor erro médio. Só entram modelos presentes nas duas.
 */
export function montarRanking(temperatura: RespostaMetricas, sensacao: RespostaMetricas): LinhaRanking[] {
  const posT = posicoes(temperatura)
  const posS = posicoes(sensacao)
  const linhas: Omit<LinhaRanking, 'posicaoGeral'>[] = []

  for (const t of temperatura.metricas) {
    const s = sensacao.metricas.find((l) => l.modelo === t.modelo)
    if (!s || t.mae == null || s.mae == null) continue
    const larguras = [t.largura_faixa, s.largura_faixa]
    linhas.push({
      modelo: t.modelo,
      nome: t.nome_modelo,
      temperatura: { posicao: posT.get(t.modelo) ?? 0, linha: t, vsRegra: classificarVsRegra(t) },
      sensacao: { posicao: posS.get(s.modelo) ?? 0, linha: s, vsRegra: classificarVsRegra(s) },
      posicaoMedia: ((posT.get(t.modelo) ?? 0) + (posS.get(s.modelo) ?? 0)) / 2,
      erroMedio: arredondar2((t.mae + s.mae) / 2),
      larguraMedia: larguras.every((l) => l != null) ? ((larguras[0] as number) + (larguras[1] as number)) / 2 : null,
    })
  }

  linhas.sort((a, b) => a.posicaoMedia - b.posicaoMedia || a.erroMedio - b.erroMedio)
  return linhas.map((l, i) => ({ ...l, posicaoGeral: i + 1 }))
}

/** Em quantas das duas variáveis o modelo foi melhor que a regra simples (0, 1 ou 2). */
export const vitoriasSobreARegra = (l: LinhaRanking) =>
  [l.temperatura.vsRegra, l.sensacao.vsRegra].filter((v) => v === 'melhor').length
