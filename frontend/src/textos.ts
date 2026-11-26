// Textos em linguagem simples, gerados por REGRAS a partir dos números da API (decisão D46).
// Cada frase só afirma o que os números mostram — nada é inventado. Datas em DD-MM-AAAA e
// números com vírgula (formatacao.ts). Funções puras: testadas em textos.test.ts.
import type {
  LinhaMetricas,
  Modelo,
  RespostaCasoEstudo,
  RespostaMetricas,
  RespostaPrevisao,
  RespostaTeste,
} from './api'
import { formatarComSinal, formatarData, formatarDiaMes, formatarGraus, formatarNumero } from './formatacao'
import { type LinhaRanking, vitoriasSobreARegra } from './ranking'

// Temperaturas com 1 casa ("29,1 °C"); erros e variações com 2 casas, iguais às tabelas ("0,38 °C").
const graus = (valor: number | null | undefined) => formatarGraus(valor, 1)
const erro = (valor: number | null | undefined) => formatarGraus(valor, 2)
const plural = (n: number, singular: string, pluralTexto: string) => (n === 1 ? singular : pluralTexto)
// ["A", "B", "C"] -> "A, B e C"
const juntarNomes = (nomes: string[]) =>
  nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : (nomes[0] ?? '')

// ---------------------------------------------------------------------------
// Explicações curtas (ícones "i" e descrição dos modelos)
// ---------------------------------------------------------------------------

export const DESCRICAO_MODELO: Record<Modelo, string> = {
  linha_base:
    'Regra simples: repete a média dos últimos 7 dias. Serve de régua — um modelo só vale a pena se errar menos que ela.',
  ets: 'Suavização exponencial: faz uma média dos dias anteriores, dando mais peso aos mais recentes.',
  sarima: 'Usa os dias anteriores e a tendência recente para projetar os próximos dias.',
  prophet:
    'Desenha uma linha de tendência sobre o histórico (criado pela Meta). Pensado para séries longas; aqui serve de comparação.',
  chronos:
    'IA moderna (criada pela Amazon): uma rede neural que já aprendeu com milhões de séries. Não é treinada com estes dados — só lê o histórico e projeta. Costuma dar uma faixa mais larga.',
}

export const AJUDA = {
  faixa:
    'Faixa de 95%: o intervalo onde o valor real deve cair em 95 de cada 100 dias. Faixa larga = mais incerteza.',
  erroMedio:
    'Erro médio (MAE): nos dias de teste, quanto a previsão errou, em média, para cima ou para baixo.',
  acertouFaixa:
    'Em quantos dias de teste o valor real caiu dentro da faixa prevista. O ideal é perto de 95% dos dias.',
  regraSimples:
    'Comparação com a regra simples (média dos últimos 7 dias). "18% melhor" = errou 18% menos que ela.',
  rmse: 'RMSE: parecido com o erro médio, mas pesa mais os erros grandes. Sempre maior ou igual ao erro médio.',
  vies: 'Viés: o erro médio com sinal. Negativo = em média previu abaixo do real; positivo = acima.',
  teste:
    'Período de teste: os últimos dias foram escondidos do modelo; ele previu esses dias e comparamos com o que aconteceu.',
  posicaoMedia:
    'Média das posições do modelo na temperatura e na sensação (1 = menor erro). Quanto menor, mais regular: o 1º geral é o que foi bem nas duas.',
  erroMedioGeral: 'Média simples do erro médio na temperatura e na sensação. Mostra quem erra menos no total.',
  larguraFaixa:
    'Largura da faixa: distância média entre o mínimo e o máximo previstos (temperatura / sensação). Faixa estreita que acerta = previsão útil; faixa larga "acerta" fácil, mas diz pouco.',
}

// ---------------------------------------------------------------------------
// Resumo da previsão (cartões + parágrafo)
// ---------------------------------------------------------------------------

export interface Tendencia {
  rotulo: string // para o cartão: "Estável", "Leve alta"...
  frase: string // para o texto: "estável", "com leve alta"...
}

/** Classifica a variação prevista (°C) — limites em D46: < 0,2 estável; < 0,5 leve; senão forte. */
export function classificarTendencia(variacao: number): Tendencia {
  const tamanho = Math.abs(variacao)
  if (tamanho < 0.2) return { rotulo: 'Estável', frase: 'estável' }
  const sobe = variacao > 0
  if (tamanho < 0.5) {
    return sobe
      ? { rotulo: 'Leve alta', frase: 'com leve alta' }
      : { rotulo: 'Leve queda', frase: 'com leve queda' }
  }
  return sobe ? { rotulo: 'Alta', frase: 'em alta' } : { rotulo: 'Queda', frase: 'em queda' }
}

export interface Cartao {
  titulo: string
  valor: string
  detalhe: string
}

export function resumoPrevisao(
  resposta: RespostaPrevisao,
  nomeVariavel: string,
): { cartoes: Cartao[]; texto: string } {
  const prev = resposta.previsao
  const primeiro = prev[0]
  const ultimo = prev[prev.length - 1]
  const ultimoReal = resposta.historico[resposta.historico.length - 1]
  const variacao = (ultimo.previsao ?? 0) - (ultimoReal.valor ?? 0)
  const tendencia = classificarTendencia(variacao)
  const minimo = Math.min(...prev.map((p) => p.inferior ?? Infinity))
  const maximo = Math.max(...prev.map((p) => p.superior ?? -Infinity))
  const nome = nomeVariavel.toLowerCase()

  const cartoes: Cartao[] = [
    {
      titulo: `Amanhã (${formatarDiaMes(primeiro.data)})`,
      valor: graus(primeiro.previsao),
      detalhe: `entre ${graus(primeiro.inferior)} e ${graus(primeiro.superior)}`,
    },
    {
      titulo: `Tendência em ${prev.length} ${plural(prev.length, 'dia', 'dias')}`,
      valor: tendencia.rotulo,
      detalhe: `${formatarComSinal(variacao, ' °C', 2)} em relação ao último dado (${formatarData(ultimoReal.data)})`,
    },
  ]
  if (prev.length > 1) {
    cartoes.splice(1, 0, {
      titulo: `Em ${formatarData(ultimo.data)}`,
      valor: graus(ultimo.previsao),
      detalhe: `entre ${graus(ultimo.inferior)} e ${graus(ultimo.superior)}`,
    })
  }

  const texto =
    prev.length === 1
      ? `Amanhã (${formatarData(primeiro.data)}), a ${nome} deve ficar em ${graus(primeiro.previsao)}, ` +
        `provavelmente entre ${graus(primeiro.inferior)} e ${graus(primeiro.superior)}.`
      : `Nos próximos ${prev.length} dias, a ${nome} deve ficar ${tendencia.frase}: ` +
        `de ${graus(primeiro.previsao)} em ${formatarData(primeiro.data)} para ${graus(ultimo.previsao)} ` +
        `em ${formatarData(ultimo.data)}. O mais provável é que fique entre ${graus(minimo)} e ${graus(maximo)}.`
  return { cartoes, texto }
}

/** "Dá para confiar?" — o desempenho do modelo nos dias de teste, em linguagem simples. */
export function textoConfianca(linha: LinhaMetricas, diasTeste: number): string {
  const acertos = Math.round(((linha.cobertura ?? 0) / 100) * diasTeste)
  let texto =
    `Testamos este modelo em ${diasTeste} dias que ele não conhecia: ele errou em média ` +
    `${erro(linha.mae)} e acertou a faixa em ${acertos} de ${diasTeste} dias.`
  const pct = linha.mae_vs_linha_base ?? 0
  if (linha.modelo === 'linha_base') texto += ' Esta é a regra simples, usada como régua para os outros modelos.'
  else if (Math.abs(pct) < 3) texto += ' Ficou praticamente empatado com a regra simples.'
  else if (pct < 0) texto += ` É ${formatarNumero(-pct, 0)}% mais preciso que a regra simples.`
  else texto += ` Errou ${formatarNumero(pct, 0)}% mais que a regra simples — use com cautela.`
  return texto
}

// ---------------------------------------------------------------------------
// Comparação dos modelos, teste e caso de estudo
// ---------------------------------------------------------------------------

/** Célula "vs regra simples": "18% melhor", "13% pior", "empate" (< 3%) ou "é a régua". */
export function rotuloVsRegraSimples(linha: LinhaMetricas): string {
  if (linha.modelo === 'linha_base') return 'é a régua'
  const pct = linha.mae_vs_linha_base ?? 0
  if (Math.abs(pct) < 3) return 'empate'
  return `${formatarNumero(Math.abs(pct), 0)}% ${pct < 0 ? 'melhor' : 'pior'}`
}

/**
 * Texto do card "Ranking geral" (as duas variáveis juntas). Regras:
 * - o 1º do ranking = o mais regular (menor posição média);
 * - se outro modelo tem o menor erro somando as duas, o texto diz isso e por que ele não é o
 *   1º: venceu a regra simples em menos variáveis e/ou faixa pelo menos 1,5x mais larga;
 * - o modelo que mais oscilou (3 ou mais posições de diferença entre as variáveis) é citado.
 */
export function textoRanking(linhas: LinhaRanking[]): string {
  if (linhas.length === 0) return ''
  const primeiro = linhas[0]
  const posicoesTexto = (l: LinhaRanking) =>
    `${l.temperatura.posicao}º na temperatura e ${l.sensacao.posicao}º na sensação térmica`

  let texto = `No geral, o ${primeiro.nome} foi o mais regular: ${posicoesTexto(primeiro)}.`
  if (vitoriasSobreARegra(primeiro) === 2) texto += ' Foi melhor que a regra simples nas duas.'

  // Menor erro somando as duas (no empate, vale a ordem do ranking).
  const menorErro = linhas.reduce((a, b) => (b.erroMedio < a.erroMedio ? b : a))
  if (menorErro.modelo !== primeiro.modelo) {
    const motivos: string[] = []
    const vitorias = vitoriasSobreARegra(menorErro)
    if (vitorias < vitoriasSobreARegra(primeiro)) {
      motivos.push(
        vitorias === 0
          ? 'não superou a regra simples em nenhuma das duas'
          : 'superou a regra simples em só uma das duas',
      )
    }
    if (menorErro.larguraMedia != null && primeiro.larguraMedia != null) {
      const vezes = menorErro.larguraMedia / primeiro.larguraMedia
      if (vezes >= 1.5) motivos.push(`sua faixa é ${formatarNumero(vezes, 1)} vezes mais larga`)
    }
    texto +=
      ` O ${menorErro.nome} teve o menor erro somando as duas (${erro(menorErro.erroMedio)} contra ` +
      `${erro(primeiro.erroMedio)})` +
      (motivos.length ? `, mas ${motivos.join(' e ')}.` : ', mas ficou atrás nas posições.')
  }

  // Quem mais oscilou entre as variáveis (ex.: 1º numa, 5º na outra).
  const oscilacao = (l: LinhaRanking) => Math.abs(l.temperatura.posicao - l.sensacao.posicao)
  const oscilante = linhas.reduce((a, b) => (oscilacao(b) > oscilacao(a) ? b : a))
  if (oscilacao(oscilante) >= 3) {
    texto += ` O ${oscilante.nome} foi o que mais oscilou: ${posicoesTexto(oscilante)}.`
  }
  return texto
}

export function textoComparacao(resposta: RespostaMetricas): string {
  const linhas = [...resposta.metricas].sort((a, b) => (a.mae ?? Infinity) - (b.mae ?? Infinity))
  const melhor = linhas[0]
  const base = resposta.metricas.find((l) => l.modelo === 'linha_base')
  // Empate: a API manda o erro com 2 casas; se dois modelos têm o mesmo número, a tabela marca os
  // dois como "menor erro" — o texto precisa dizer o mesmo (achado com o 5º modelo, Chronos-2).
  const empatados = linhas.filter((l) => l.mae === melhor.mae)
  let texto =
    empatados.length > 1
      ? `${juntarNomes(empatados.map((l) => l.nome_modelo))} empataram com o menor erro: ${erro(melhor.mae)} em média.`
      : `O modelo com menor erro foi o ${melhor.nome_modelo}: errou em média ${erro(melhor.mae)}.`
  const ganhos = empatados
    .filter((l) => l.modelo !== 'linha_base' && l.mae_vs_linha_base != null)
    .map((l) => Math.round(-(l.mae_vs_linha_base as number)))
  if (base && ganhos.length > 0) {
    const menor = Math.min(...ganhos)
    const maior = Math.max(...ganhos)
    const faixa = menor === maior ? `${menor}%` : `${menor}% a ${maior}%`
    texto += ` Isso é ${faixa} menos erro que a regra simples.`
  }
  if (base && (base.mae ?? 0) - (melhor.mae ?? 0) < 0.05) {
    texto += ' As diferenças entre os modelos são pequenas (menos de 0,05 °C): com poucos dias de teste, podem ser sorte.'
  }
  return texto
}

export function textoTeste(resposta: RespostaTeste): string {
  const dias = resposta.dias
  const maior = dias.reduce((a, b) => (Math.abs(b.erro ?? 0) > Math.abs(a.erro ?? 0) ? b : a))
  const fora = dias.filter((d) => !d.dentro_da_faixa).length
  let texto =
    `Nos ${dias.length} dias de teste (${formatarData(resposta.teste.inicio)} a ${formatarData(resposta.teste.fim)}), ` +
    `o ${resposta.nome_modelo} errou em média ${erro(resposta.metricas.mae)}. ` +
    `O maior erro foi em ${formatarData(maior.data)}: previu ${graus(maior.previsao)}, mas o real foi ${graus(maior.real)}.`
  texto +=
    fora === 0
      ? ' Todos os dias reais ficaram dentro da faixa prevista.'
      : ` ${fora} ${plural(fora, 'dia ficou', 'dias ficaram')} fora da faixa prevista (marcados com ✕).`
  const vies = resposta.metricas.vies ?? 0
  if (vies <= -0.1) texto += ' No geral, o modelo previu um pouco abaixo do real.'
  else if (vies >= 0.1) texto += ' No geral, o modelo previu um pouco acima do real.'
  return texto
}

export function textoCasoEstudo(resposta: RespostaCasoEstudo, nomeVariavel: string): string {
  const resultado = (id: string) => resposta.resultados.find((r) => r.cenario === id)
  const cenario = (id: string) => resposta.cenarios.find((c) => c.id === id)
  const antes = resultado('so_antes')
  const tudo = resultado('tudo')
  if (!antes || !tudo) return ''

  const subiu = (cenario('so_depois')?.media_treino ?? 0) >= (cenario('so_antes')?.media_treino ?? 0)
  const nome = nomeVariavel.toLowerCase()
  const maeAntes = antes.metricas.mae ?? 0
  const maeTudo = tudo.metricas.mae ?? 0
  const diasTeste = resposta.teste.dias
  // O Chronos-2 não é treinado com os nossos dados: ele só "vê" o histórico (D47). As frases
  // dizem "viu" em vez de "treinado" para não afirmar algo falso (D46).
  const semTreino = antes.modelo === 'chronos'
  const soAntes = semTreino ? 'que só viu os dias anteriores' : 'treinado só com os dias anteriores'
  const comTudo = semTreino ? 'que viu todos os dias' : 'treinado com todos os dias'

  let texto = `A partir de ${formatarData(resposta.data_mudanca)}, a ${nome} passou a ficar mais ${subiu ? 'alta' : 'baixa'} que antes. `
  if (maeTudo > 0 && maeAntes > maeTudo * 1.3) {
    const vies = antes.metricas.vies ?? 0
    texto +=
      `O modelo ${soAntes} errou em média ${erro(maeAntes)} — ` +
      `${formatarNumero(maeAntes / maeTudo, 1)} vezes o erro do modelo ${comTudo} (${erro(maeTudo)}). ` +
      `Ele continuou preso ao nível antigo e previu ${vies < 0 ? 'abaixo' : 'acima'} do real (em média ${erro(Math.abs(vies))}).`
    const acertos = Math.round(((antes.metricas.cobertura ?? 0) / 100) * diasTeste)
    if (acertos <= diasTeste / 2) {
      const quanto =
        acertos === 0 ? `não acertou nenhum dos ${diasTeste} dias` : `acertou só ${acertos} de ${diasTeste} dias`
      texto += ` E a faixa de confiança dele ${quanto}: estava confiante, mas no nível errado.`
    } else {
      // Errou o nível, mas a faixa "acertou": só pode ser porque a faixa era larga (ex.: Chronos-2).
      texto +=
        ` A faixa dele ainda cobriu ${acertos} de ${diasTeste} dias, mas só porque era larga: ` +
        'acertar a faixa não quer dizer que a previsão foi boa.'
    }
  } else {
    texto +=
      `Neste modelo, ${semTreino ? 'ver só os dias anteriores' : 'treinar só com os dias anteriores'} quase não atrapalhou (${erro(maeAntes)} contra ${erro(maeTudo)}): ` +
      'ele prolonga a tendência que já vinha antes da mudança.'
  }
  const licao = semTreino
    ? ' Lição: quando o comportamento muda, o modelo precisa receber os dados recentes — por isso esta ferramenta atualiza os dados todo dia.'
    : ' Lição: quando o comportamento muda, o modelo precisa ser treinado de novo com os dados recentes — por isso esta ferramenta atualiza e retreina todo dia.'
  return texto + licao
}
