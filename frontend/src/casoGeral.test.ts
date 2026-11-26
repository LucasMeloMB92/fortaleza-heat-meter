import { describe, expect, it } from 'vitest'
import type { Modelo, RespostaCasoEstudo, Variavel } from './api'
import { acertosSoAntes, impactos } from './casoGeral'
import { textoCasoEstudoGeral } from './textos'

const NOMES: Record<Modelo, string> = {
  linha_base: 'Linha de base',
  ets: 'ETS',
  sarima: 'SARIMA',
  prophet: 'Prophet',
  chronos: 'Chronos-2',
}

// [mae "só antes", cobertura "só antes" (%), mae "tudo"] — números reais de 26-11-2026.
type Dados = Record<Modelo, [number, number, number]>

function caso(variavel: Variavel, dados: Dados): RespostaCasoEstudo {
  const m = (mae: number, cobertura: number) => ({
    mae,
    rmse: mae,
    cobertura,
    mae_dias_1_7: mae,
    vies: -mae,
    largura_faixa: 2,
  })
  const resultados = (Object.keys(dados) as Modelo[]).flatMap((modelo) => {
    const [antes, cob, tudo] = dados[modelo]
    const base = { modelo, nome_modelo: NOMES[modelo], horizonte: 10, previsao: [] }
    return [
      { ...base, cenario: 'so_antes' as const, metricas: m(antes, cob) },
      { ...base, cenario: 'tudo' as const, metricas: m(tudo, 90) },
    ]
  })
  return {
    variavel,
    data_mudanca: '2026-10-15',
    teste: { inicio: '2026-11-16', fim: '2026-11-25', dias: 10 },
    cenarios: [],
    real: [],
    resultados,
  }
}

const temperatura = caso('temperatura', {
  linha_base: [0.94, 10, 0.46],
  ets: [0.95, 50, 0.43],
  sarima: [1.11, 10, 0.38],
  prophet: [0.31, 90, 0.31],
  chronos: [1.04, 100, 0.31],
})
const sensacao = caso('sensacao', {
  linha_base: [1.29, 50, 0.34],
  ets: [1.36, 100, 0.33],
  sarima: [1.79, 0, 0.29],
  prophet: [0.35, 90, 0.38],
  chronos: [1.49, 100, 0.33],
})

describe('impactos', () => {
  it('ordena do que mais piorou para o que menos piorou', () => {
    const lista = impactos(sensacao)
    expect(lista.map((i) => i.modelo)).toEqual(['sarima', 'chronos', 'ets', 'linha_base', 'prophet'])
    expect(lista[0].vezes).toBeCloseTo(1.79 / 0.29)
    expect(acertosSoAntes(lista[0], 10)).toBe(0)
  })
})

describe('textoCasoEstudoGeral', () => {
  it('resume quem sofreu, o pior caso, quem não sentiu e o que a faixa mostrou', () => {
    expect(textoCasoEstudoGeral(temperatura, sensacao)).toBe(
      'Sem ver a mudança, 4 dos 5 modelos tiveram um erro de 2,0 a 6,2 vezes maior do que quando ' +
        'viram todos os dias. O que mais sofreu foi o SARIMA na sensação térmica (6,2 vezes). ' +
        'O Prophet quase não sentiu a mudança nas duas variáveis. ' +
        'SARIMA, ETS e Linha de base acertaram a faixa em metade dos dias ou menos em pelo menos ' +
        'uma variável: confiantes, mas no nível errado. ' +
        'Chronos-2 acertou a faixa na maioria dos dias mesmo errando o nível — só porque a faixa ' +
        'era larga. ' +
        'Lição: quando o comportamento muda, os modelos precisam dos dados recentes — por isso esta ' +
        'ferramenta atualiza os dados e refaz os modelos todo dia.',
    )
  })
})
