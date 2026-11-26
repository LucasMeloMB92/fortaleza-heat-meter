import { describe, expect, it } from 'vitest'
import type { LinhaMetricas, Modelo, RespostaMetricas } from './api'
import { classificarVsRegra, montarRanking, posicoes } from './ranking'
import { textoRanking } from './textos'

const NOMES: Record<Modelo, string> = {
  linha_base: 'Linha de base',
  ets: 'ETS',
  sarima: 'SARIMA',
  prophet: 'Prophet',
  chronos: 'Chronos-2',
}

function linha(modelo: Modelo, mae: number, vsBase: number, largura: number): LinhaMetricas {
  return {
    modelo,
    nome_modelo: NOMES[modelo],
    configuracao: null,
    mae,
    rmse: mae,
    cobertura: 90,
    mae_dias_1_7: mae,
    vies: 0,
    largura_faixa: largura,
    mae_vs_linha_base: vsBase,
  }
}

const resposta = (variavel: 'temperatura' | 'sensacao', metricas: LinhaMetricas[]): RespostaMetricas => ({
  variavel,
  teste: { inicio: '2026-11-16', fim: '2026-11-25', dias: 10 },
  metricas,
})

// Números reais do teste de 16-11 a 25-11-2026 (relatório final, seções 6 e 7).
const temperatura = resposta('temperatura', [
  linha('linha_base', 0.46, 0, 1.19),
  linha('ets', 0.43, -5.51, 1.3),
  linha('sarima', 0.38, -18.06, 1.14),
  linha('prophet', 0.31, -33.11, 1.01),
  linha('chronos', 0.31, -31.86, 2.14),
])
const sensacao = resposta('sensacao', [
  linha('linha_base', 0.34, 0, 2.21),
  linha('ets', 0.33, -2.34, 3.42),
  linha('sarima', 0.29, -15.44, 2.02),
  linha('prophet', 0.38, 13, 1.66),
  linha('chronos', 0.33, -0.74, 4.05),
])

describe('posicoes', () => {
  it('ordena pelo erro médio e desempata pelo "vs regra simples" (MAE sem arredondar)', () => {
    const t = posicoes(temperatura)
    expect(t.get('prophet')).toBe(1) // 0,31 com −33,11%
    expect(t.get('chronos')).toBe(2) // 0,31 com −31,86%
    expect(t.get('linha_base')).toBe(5)
    const s = posicoes(sensacao)
    expect(s.get('ets')).toBe(2) // 0,33 com −2,34%
    expect(s.get('chronos')).toBe(3) // 0,33 com −0,74%
  })
})

describe('classificarVsRegra', () => {
  it('usa o limite de 3% da D46 e marca a linha de base como régua', () => {
    expect(classificarVsRegra(linha('sarima', 0.29, -15.44, 2))).toBe('melhor')
    expect(classificarVsRegra(linha('ets', 0.33, -2.34, 3))).toBe('empate')
    expect(classificarVsRegra(linha('prophet', 0.38, 13, 1))).toBe('pior')
    expect(classificarVsRegra(linha('linha_base', 0.34, 0, 2))).toBe('regua')
  })
})

describe('montarRanking', () => {
  const ranking = montarRanking(temperatura, sensacao)

  it('ordena pela posição média e desempata pelo erro médio', () => {
    expect(ranking.map((l) => l.modelo)).toEqual(['sarima', 'chronos', 'prophet', 'ets', 'linha_base'])
    expect(ranking.map((l) => l.posicaoMedia)).toEqual([2, 2.5, 3, 3, 4.5])
    expect(ranking.map((l) => l.posicaoGeral)).toEqual([1, 2, 3, 4, 5])
  })

  it('calcula erro médio e largura média das duas variáveis', () => {
    const sarima = ranking[0]
    expect(sarima.erroMedio).toBe(0.34) // 0,335 arredondado como à mão (não 0,33)
    expect(ranking.map((l) => l.erroMedio)).toEqual([0.34, 0.32, 0.35, 0.38, 0.4])
    expect(sarima.larguraMedia).toBeCloseTo(1.58)
    expect(sarima.temperatura.posicao).toBe(3)
    expect(sarima.sensacao.posicao).toBe(1)
  })

  it('sem largura na API (versão antiga), a largura média fica nula', () => {
    const semLargura = resposta(
      'temperatura',
      temperatura.metricas.map((l) => ({ ...l, largura_faixa: undefined })),
    )
    expect(montarRanking(semLargura, sensacao)[0].larguraMedia).toBeNull()
  })
})

describe('textoRanking', () => {
  it('explica o 1º, quem teve o menor erro somado e quem mais oscilou', () => {
    expect(textoRanking(montarRanking(temperatura, sensacao))).toBe(
      'No geral, o SARIMA foi o mais regular: 3º na temperatura e 1º na sensação térmica. ' +
        'Foi melhor que a regra simples nas duas. ' +
        'O Chronos-2 teve o menor erro somando as duas (0,32 °C contra 0,34 °C), mas superou a ' +
        'regra simples em só uma das duas e sua faixa é 2,0 vezes mais larga. ' +
        'O Prophet foi o que mais oscilou: 1º na temperatura e 5º na sensação térmica.',
    )
  })

  it('quando o 1º também tem o menor erro, não fala de outro modelo', () => {
    const t = resposta('temperatura', [linha('linha_base', 0.46, 0, 1), linha('sarima', 0.3, -35, 1)])
    const s = resposta('sensacao', [linha('linha_base', 0.34, 0, 2), linha('sarima', 0.25, -26, 2)])
    expect(textoRanking(montarRanking(t, s))).toBe(
      'No geral, o SARIMA foi o mais regular: 1º na temperatura e 1º na sensação térmica. ' +
        'Foi melhor que a regra simples nas duas.',
    )
  })
})
