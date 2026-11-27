import { describe, expect, it } from 'vitest'
import type { Modelo, RespostaCasoEstudo } from './api'
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

function caso(dados: Dados): RespostaCasoEstudo {
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
    data_mudanca: '2026-10-15',
    teste: { inicio: '2026-11-16', fim: '2026-11-25', dias: 10 },
    cenarios: [],
    real: [],
    resultados,
  }
}

const temperatura = caso({
  linha_base: [0.94, 10, 0.46],
  ets: [0.95, 50, 0.43],
  sarima: [1.11, 10, 0.38],
  prophet: [0.31, 90, 0.31],
  chronos: [1.04, 100, 0.31],
})
describe('impactos', () => {
  it('ordena do que mais piorou para o que menos piorou', () => {
    const lista = impactos(temperatura)
    expect(lista.map((i) => i.modelo)).toEqual(['chronos', 'sarima', 'ets', 'linha_base', 'prophet'])
    expect(lista[0].vezes).toBeCloseTo(1.04 / 0.31)
    expect(acertosSoAntes(lista[1], 10)).toBe(1)
  })
})

describe('textoCasoEstudoGeral', () => {
  it('resume quem sofreu, o pior caso, quem não sentiu e o que a faixa mostrou', () => {
    expect(textoCasoEstudoGeral(temperatura)).toBe(
      'Sem ver a mudança, 4 dos 5 modelos tiveram um erro de 2,0 a 3,4 vezes maior do que quando ' +
        'viram todos os dias. O que mais sofreu foi o Chronos-2 (3,4 vezes). ' +
        'O Prophet quase não sentiu a mudança. ' +
        'SARIMA, ETS e Linha de base acertaram a faixa em metade dos dias ou menos: ' +
        'confiantes, mas no nível errado. ' +
        'Chronos-2 acertou a faixa na maioria dos dias mesmo errando o nível — só porque a faixa ' +
        'era larga. ' +
        'Lição: quando o comportamento muda, os modelos precisam dos dados recentes — por isso esta ' +
        'ferramenta atualiza os dados e refaz os modelos todo dia.',
    )
  })
})
