// Caso de estudo com TODOS os modelos (aba da visão geral): para cada modelo, quanto o
// erro piorou quando ele só conhecia os dias antes da mudança. Funções puras (só contas);
// as frases ficam em textos.ts (D46). Testadas em casoGeral.test.ts.
import type { Metricas, Modelo, RespostaCasoEstudo } from './api'

/** Piorou "de verdade" a partir de 1,3x o erro (mesmo limite do texto do caso de estudo, D46). */
export const LIMITE_PIOROU = 1.3

export interface ImpactoMudanca {
  modelo: Modelo
  nome: string
  soAntes: Metricas // treinado (ou, no Chronos-2, com contexto) só antes da mudança
  tudo: Metricas // treinado com todos os dias até a véspera do teste
  vezes: number // erro "só antes" ÷ erro "tudo": 2,0 = errou o dobro
}

/** Uma linha por modelo, do que mais piorou para o que menos piorou. */
export function impactos(resposta: RespostaCasoEstudo): ImpactoMudanca[] {
  const lista: ImpactoMudanca[] = []
  for (const antes of resposta.resultados.filter((r) => r.cenario === 'so_antes')) {
    const tudo = resposta.resultados.find((r) => r.cenario === 'tudo' && r.modelo === antes.modelo)
    if (!tudo || antes.metricas.mae == null || !tudo.metricas.mae) continue
    lista.push({
      modelo: antes.modelo,
      nome: antes.nome_modelo,
      soAntes: antes.metricas,
      tudo: tudo.metricas,
      vezes: antes.metricas.mae / tudo.metricas.mae,
    })
  }
  return lista.sort((a, b) => b.vezes - a.vezes)
}

/** Acertos da faixa "só antes" em dias (cobertura em % × dias de teste). */
export const acertosSoAntes = (i: ImpactoMudanca, diasTeste: number) =>
  Math.round(((i.soAntes.cobertura ?? 0) / 100) * diasTeste)
