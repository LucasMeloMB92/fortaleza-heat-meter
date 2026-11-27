import { describe, expect, it } from 'vitest'
import type { LinhaMetricas, RespostaCasoEstudo, RespostaMetricas, RespostaPrevisao, RespostaTeste } from './api'
import {
  classificarTendencia,
  resumoPrevisao,
  rotuloVsRegraSimples,
  textoCasoEstudo,
  textoComparacao,
  textoConfianca,
  textoTeste,
} from './textos'

const metricasVazias = { rmse: 0.5, mae_dias_1_7: 0.3 }

function linha(modelo: LinhaMetricas['modelo'], mae: number, vsBase: number, cobertura = 90): LinhaMetricas {
  return {
    modelo,
    nome_modelo: { linha_base: 'Linha de base', ets: 'ETS', sarima: 'SARIMA', prophet: 'Prophet', chronos: 'Chronos-2' }[modelo],
    configuracao: null,
    mae,
    cobertura,
    vies: -0.1,
    mae_vs_linha_base: vsBase,
    ...metricasVazias,
  }
}

const previsao7: RespostaPrevisao = {
  modelo: 'sarima',
  nome_modelo: 'SARIMA',
  horizonte: 3,
  nivel_intervalo: 0.95,
  configuracao: null,
  historico: [{ data: '2026-11-25', valor: 29.1 }],
  previsao: [
    { data: '2026-11-26', previsao: 29.09, inferior: 28.52, superior: 29.66 },
    { data: '2026-11-27', previsao: 29.2, inferior: 28.5, superior: 29.8 },
    { data: '2026-11-28', previsao: 29.4, inferior: 28.6, superior: 29.9 },
  ],
}

describe('classificarTendencia (limites da D46)', () => {
  it('rótulo e número não se contradizem: +0,16 °C é "Estável" e aparece com 2 casas', () => {
    const quase = { ...previsao7, previsao: [{ data: '2026-11-26', previsao: 29.26, inferior: 28.6, superior: 29.9 }, previsao7.previsao[1]] }
    quase.previsao[1] = { ...quase.previsao[1], previsao: 29.26 }
    const { cartoes } = resumoPrevisao(quase)
    expect(cartoes[2].valor).toBe('Estável')
    expect(cartoes[2].detalhe).toContain('+0,16 °C') // antes aparecia "+0,2", contradizendo "Estável"
  })

  it.each([
    [0.1, 'Estável'],
    [-0.19, 'Estável'],
    [0.3, 'Leve alta'],
    [-0.3, 'Leve queda'],
    [0.6, 'Alta'],
    [-0.8, 'Queda'],
  ])('variação %s °C -> %s', (variacao, rotulo) => {
    expect(classificarTendencia(variacao).rotulo).toBe(rotulo)
  })
})

describe('resumoPrevisao', () => {
  it('gera 3 cartões e um texto com datas DD-MM-AAAA e vírgula', () => {
    const { cartoes, texto } = resumoPrevisao(previsao7)
    expect(cartoes.map((c) => c.titulo)).toEqual(['Amanhã (26-11)', 'Em 28-11-2026', 'Tendência em 3 dias'])
    expect(cartoes[0].valor).toBe('29,1 °C')
    expect(cartoes[2].valor).toBe('Leve alta') // 29,4 - 29,1 = +0,3
    expect(cartoes[2].detalhe).toBe('+0,30 °C em relação ao último dado (25-11-2026)')
    expect(texto).toBe(
      'Nos próximos 3 dias, a temperatura média deve ficar com leve alta: de 29,1 °C em 26-11-2026 ' +
        'para 29,4 °C em 28-11-2026. O mais provável é que fique entre 28,5 °C e 29,9 °C.',
    )
  })

  it('horizonte de 1 dia: frase própria e só 2 cartões', () => {
    const umDia = { ...previsao7, previsao: previsao7.previsao.slice(0, 1) }
    const { cartoes, texto } = resumoPrevisao(umDia)
    expect(cartoes).toHaveLength(2)
    expect(texto).toBe(
      'Amanhã (26-11-2026), a temperatura média deve ficar em 29,1 °C, provavelmente entre 28,5 °C e 29,7 °C.',
    )
  })
})

describe('textoConfianca', () => {
  it('modelo melhor que a regra simples', () => {
    expect(textoConfianca(linha('sarima', 0.38, -18.06), 10)).toBe(
      'Testamos este modelo em 10 dias que ele não conhecia: ele errou em média 0,38 °C e acertou a faixa ' +
        'em 9 de 10 dias. É 18% mais preciso que a regra simples.',
    )
  })

  it('empate, pior e a própria regra simples', () => {
    expect(textoConfianca(linha('ets', 0.33, -2.3), 10)).toContain('praticamente empatado')
    expect(textoConfianca(linha('prophet', 0.38, 13), 10)).toContain('Errou 13% mais que a regra simples')
    expect(textoConfianca(linha('linha_base', 0.46, 0, 70), 10)).toContain('acertou a faixa em 7 de 10 dias')
    expect(textoConfianca(linha('linha_base', 0.46, 0), 10)).toContain('usada como régua')
  })
})

describe('rotuloVsRegraSimples', () => {
  it.each([
    [linha('sarima', 0.38, -18.06), '18% melhor'],
    [linha('prophet', 0.38, 13), '13% pior'],
    [linha('ets', 0.33, -2.34), 'empate'],
    [linha('linha_base', 0.46, 0), 'é a régua'],
  ])('%#', (l, esperado) => expect(rotuloVsRegraSimples(l)).toBe(esperado))
})

describe('textoComparacao', () => {
  const resposta = (metricas: LinhaMetricas[]): RespostaMetricas => ({
    teste: { inicio: '2026-11-16', fim: '2026-11-25', dias: 10 },
    metricas,
  })

  it('aponta o melhor e quanto ele ganha da regra simples', () => {
    const texto = textoComparacao(resposta([linha('linha_base', 0.46, 0), linha('prophet', 0.31, -33.11)]))
    expect(texto).toBe('O modelo com menor erro foi o Prophet: errou em média 0,31 °C. Isso é 33% menos erro que a regra simples.')
  })

  it('cita todos os modelos empatados no menor erro (como a tabela)', () => {
    const texto = textoComparacao(
      resposta([linha('linha_base', 0.46, 0), linha('prophet', 0.31, -33.11), linha('chronos', 0.31, -31.86)]),
    )
    expect(texto).toBe(
      'Prophet e Chronos-2 empataram com o menor erro: 0,31 °C em média. Isso é 32% a 33% menos erro que a regra simples.',
    )
  })

  it('avisa quando a diferença é pequena demais para confiar', () => {
    const texto = textoComparacao(resposta([linha('linha_base', 0.34, 0), linha('ets', 0.33, -2.34)]))
    expect(texto).toContain('podem ser sorte')
  })
})

describe('textoTeste', () => {
  it('cita o maior erro, os dias fora da faixa e o viés', () => {
    const resposta: RespostaTeste = {
      modelo: 'sarima',
      nome_modelo: 'SARIMA',
      configuracao: null,
      teste: { inicio: '2026-11-16', fim: '2026-11-17', dias: 2 },
      metricas: { mae: 0.7, rmse: 0.9, cobertura: 50, mae_dias_1_7: 0.7, vies: -0.5 },
      treino_final: [],
      dias: [
        { data: '2026-11-16', real: 27.5, previsao: 28.77, inferior: 28.25, superior: 29.29, erro: 1.27, dentro_da_faixa: false },
        { data: '2026-11-17', real: 28.6, previsao: 28.72, inferior: 28.15, superior: 29.29, erro: 0.12, dentro_da_faixa: true },
      ],
    }
    expect(textoTeste(resposta)).toBe(
      'Nos 2 dias de teste (16-11-2026 a 17-11-2026), o SARIMA errou em média 0,70 °C. O maior erro foi em ' +
        '16-11-2026: previu 28,8 °C, mas o real foi 27,5 °C. 1 dia ficou fora da faixa prevista (marcados com ✕). ' +
        'No geral, o modelo previu um pouco abaixo do real.',
    )
  })
})

describe('textoCasoEstudo', () => {
  function caso(maeAntes: number, viesAntes: number, coberturaAntes: number): RespostaCasoEstudo {
    const m = (mae: number, vies: number, cobertura: number) => ({ mae, vies, cobertura, rmse: mae, mae_dias_1_7: mae })
    const periodo = { inicio: '2026-08-28', fim: '2026-10-14', dias: 48 }
    return {
      data_mudanca: '2026-10-15',
      teste: { inicio: '2026-11-16', fim: '2026-11-25', dias: 10 },
      cenarios: [
        { id: 'so_antes', nome: 'Só antes', media_treino: 27.79, ...periodo },
        { id: 'tudo', nome: 'Tudo', media_treino: 28.06, ...periodo },
        { id: 'so_depois', nome: 'Só depois', media_treino: 28.48, ...periodo },
      ],
      real: [],
      resultados: [
        { cenario: 'so_antes', modelo: 'sarima', nome_modelo: 'SARIMA', horizonte: 42, metricas: m(maeAntes, viesAntes, coberturaAntes), previsao: [] },
        { cenario: 'tudo', modelo: 'sarima', nome_modelo: 'SARIMA', horizonte: 10, metricas: m(0.38, -0.1, 90), previsao: [] },
      ],
    }
  }

  it('modelo preso ao nível antigo: compara erros e avisa da faixa confiante', () => {
    const texto = textoCasoEstudo(caso(1.11, -1.05, 10))
    expect(texto).toContain('A partir de 15-10-2026, a temperatura média passou a ficar mais alta que antes.')
    expect(texto).toContain('errou em média 1,11 °C — 2,9 vezes o erro do modelo treinado com todos os dias (0,38 °C)')
    expect(texto).toContain('previu abaixo do real')
    expect(texto).toContain('acertou só 1 de 10 dias')
  })

  it('nenhum acerto vira "não acertou nenhum" (não "acertou só 0")', () => {
    const texto = textoCasoEstudo(caso(1.79, -1.79, 0))
    expect(texto).toContain('não acertou nenhum dos 10 dias')
    expect(texto).not.toContain('só 0')
  })

  it('Chronos-2 não é treinado: diz "viu" e explica a faixa larga que "acertou"', () => {
    const resposta = caso(1.04, -0.98, 100)
    resposta.resultados.forEach((r) => {
      r.modelo = 'chronos'
      r.nome_modelo = 'Chronos-2'
    })
    resposta.resultados[1].metricas.mae = 0.31
    const texto = textoCasoEstudo(resposta)
    expect(texto).toContain('O modelo que só viu os dias anteriores errou em média 1,04 °C')
    expect(texto).toContain('o erro do modelo que viu todos os dias (0,31 °C)')
    expect(texto).toContain('cobriu 10 de 10 dias, mas só porque era larga')
    expect(texto).toContain('precisa receber os dados recentes')
    expect(texto).not.toContain('treinad')
  })

  it('quando a mudança não atrapalhou, explica o porquê', () => {
    const texto = textoCasoEstudo(caso(0.31, 0.3, 90))
    expect(texto).toContain('quase não atrapalhou')
  })
})
