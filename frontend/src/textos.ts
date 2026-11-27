// Textos em linguagem simples, gerados por REGRAS a partir dos números da API (decisão D46).
// Cada frase só afirma o que os números mostram — nada é inventado. Datas em DD-MM-AAAA e
// números com vírgula (formatacao.ts). Funções puras: testadas em textos.test.ts.
import type {
  LinhaMetricas,
  Modelo,
  RespostaCasoEstudo,
  RespostaContexto,
  RespostaMetricas,
  RespostaPrevisao,
  RespostaTeste,
} from './api'
import { formatarComSinal, formatarData, formatarDiaMes, formatarGraus, formatarNumero } from './formatacao'
import { acertosSoAntes, impactos, LIMITE_PIOROU } from './casoGeral'

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
  subidaPeriodo:
    'Quanto a média subiu dentro do período: média dos últimos 15 dias − média dos primeiros 15. Se sobe todo ano, é a estação do ano.',
  anomalia:
    'Anomalia: quanto o valor de agora ficou acima (+) ou abaixo (−) do normal — a média dos anos anteriores no mesmo dia do calendário.',
  piorou:
    'Erro do modelo que só conhecia os dias antes da mudança ÷ erro do modelo que conhecia todos os dias. 2,0× = errou o dobro; abaixo de 1,3× = quase não sentiu.',
  faixaSoAntes:
    'Em quantos dias de teste o valor real caiu dentro da faixa do modelo que só conhecia os dias antes da mudança, e a largura dessa faixa. Poucos acertos com faixa estreita = confiante no nível errado; muitos acertos com faixa larga = acertou só por ser larga.',
  larguraFaixa:
    'Largura da faixa: distância média entre o mínimo e o máximo previstos. Faixa estreita que acerta = previsão útil; faixa larga "acerta" fácil, mas diz pouco.',
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

export function resumoPrevisao(resposta: RespostaPrevisao): { cartoes: Cartao[]; texto: string } {
  const prev = resposta.previsao
  const primeiro = prev[0]
  const ultimo = prev[prev.length - 1]
  const ultimoReal = resposta.historico[resposta.historico.length - 1]
  const variacao = (ultimo.previsao ?? 0) - (ultimoReal.valor ?? 0)
  const tendencia = classificarTendencia(variacao)
  const minimo = Math.min(...prev.map((p) => p.inferior ?? Infinity))
  const maximo = Math.max(...prev.map((p) => p.superior ?? -Infinity))

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
      ? `Amanhã (${formatarData(primeiro.data)}), a temperatura média deve ficar em ${graus(primeiro.previsao)}, ` +
        `provavelmente entre ${graus(primeiro.inferior)} e ${graus(primeiro.superior)}.`
      : `Nos próximos ${prev.length} dias, a temperatura média deve ficar ${tendencia.frase}: ` +
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
 * Texto da aba "Caso de estudo" da visão geral (todos os modelos). Regras:
 * - "sofreu" = erro "só antes" ≥ 1,3x o erro com todos os dias;
 * - "quase não sentiu" = abaixo de 1,3x;
 * - faixa "confiante no nível errado" = dos que sofreram, acertou a faixa em metade dos dias ou
 *   menos; "só porque era larga" = acertou mais da metade.
 */
export function textoCasoEstudoGeral(resposta: RespostaCasoEstudo): string {
  const modelos = impactos(resposta) // do que mais piorou para o que menos piorou
  const dias = resposta.teste.dias
  if (modelos.length === 0) return ''

  const sofreram = modelos.filter((m) => m.vezes >= LIMITE_PIOROU)
  const quaseNada = modelos.filter((m) => m.vezes < LIMITE_PIOROU)
  const frases: string[] = []

  if (sofreram.length > 0) {
    const vezes = sofreram.map((m) => m.vezes)
    const pior = sofreram[0]
    frases.push(
      `Sem ver a mudança, ${sofreram.length} dos ${modelos.length} modelos tiveram um erro de ` +
        `${formatarNumero(Math.min(...vezes), 1)} a ${formatarNumero(Math.max(...vezes), 1)} vezes maior ` +
        'do que quando viram todos os dias.',
      `O que mais sofreu foi o ${pior.nome} (${formatarNumero(pior.vezes, 1)} vezes).`,
    )
  }
  if (quaseNada.length > 0) {
    const nomes = juntarNomes(quaseNada.map((m) => m.nome))
    frases.push(`${quaseNada.length === 1 ? 'O' : 'Os modelos'} ${nomes} quase não ${quaseNada.length === 1 ? 'sentiu' : 'sentiram'} a mudança.`)
  }

  const confiantes = sofreram.filter((m) => acertosSoAntes(m, dias) <= dias / 2)
  if (confiantes.length > 0) {
    frases.push(
      `${juntarNomes(confiantes.map((m) => m.nome))} ${confiantes.length === 1 ? 'acertou' : 'acertaram'} a faixa em ` +
        'metade dos dias ou menos: confiantes, mas no nível errado.',
    )
  }
  const largos = sofreram.filter((m) => acertosSoAntes(m, dias) > dias / 2)
  if (largos.length > 0) {
    frases.push(
      `${juntarNomes(largos.map((m) => m.nome))} ${largos.length === 1 ? 'acertou' : 'acertaram'} a faixa na maioria ` +
        'dos dias mesmo errando o nível — só porque a faixa era larga.',
    )
  }
  frases.push(
    'Lição: quando o comportamento muda, os modelos precisam dos dados recentes — por isso esta ferramenta atualiza os dados e refaz os modelos todo dia.',
  )
  return frases.join(' ')
}

/** Anomalia "perto do normal" abaixo de 0,3 °C (a variação típica da temperatura é ~0,5 °C). */
const LIMITE_ANOMALIA = 0.3
/** "Subiu no período" a partir de 0,2 °C (o mesmo limite do "estável" da tendência, D46). */
const LIMITE_SUBIDA = 0.2

/**
 * Texto da aba "Anos anteriores" (D50). Regras:
 * - nível: anomalia média ≥ 0,3 °C = acima do normal; ≤ −0,3 = abaixo; senão perto do normal;
 * - estação: se TODOS os anos subiram ≥ 0,2 °C no período, a subida é da estação do ano;
 * - degrau: a data em que a anomalia mudou de patamar (a mesma do caso de estudo).
 */
export function textoAnosAnteriores(v: RespostaContexto): string {
  const atual = v.anos.at(-1)
  if (!atual) return ''
  const nome = v.nome.toLowerCase()
  const anom = v.anomalia_media ?? 0
  const normalDe = `a média de ${juntarNomes(v.anos_anteriores.map(String))} no mesmo dia`
  const nivel =
    anom >= LIMITE_ANOMALIA
      ? `${erro(anom)} acima do normal (${normalDe})`
      : anom <= -LIMITE_ANOMALIA
        ? `${erro(Math.abs(anom))} abaixo do normal (${normalDe})`
        : `perto do normal (${normalDe}; diferença de ${formatarComSinal(anom)})`
  let texto = `Em ${atual.ano}, a ${nome} do período (média dos ${atual.dias} dias) foi ${graus(atual.media)} — ${nivel}.`

  const subidas = v.anos.map((a) => `${a.ano}: ${formatarComSinal(a.subida)}`).join('; ')
  const todosSobem = v.anos.every((a) => (a.subida ?? 0) >= LIMITE_SUBIDA)
  texto += todosSobem
    ? ` Todo ano ela sobe nesse período (${subidas}) — essa parte é a estação do ano.`
    : ` A subida dentro do período variou entre os anos (${subidas}).`

  if (anom >= LIMITE_ANOMALIA || anom <= -LIMITE_ANOMALIA) {
    const m = v.mudanca
    texto +=
      ` O que muda em ${atual.ano} é o nível; e a partir de ${formatarData(m.data)} a diferença para o normal ` +
      `mudou de patamar (de ${formatarComSinal(m.anomalia_antes)} para ${formatarComSinal(m.anomalia_depois)}).`
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

export function textoCasoEstudo(resposta: RespostaCasoEstudo): string {
  const resultado = (id: string) => resposta.resultados.find((r) => r.cenario === id)
  const cenario = (id: string) => resposta.cenarios.find((c) => c.id === id)
  const antes = resultado('so_antes')
  const tudo = resultado('tudo')
  if (!antes || !tudo) return ''

  const subiu = (cenario('so_depois')?.media_treino ?? 0) >= (cenario('so_antes')?.media_treino ?? 0)
  const maeAntes = antes.metricas.mae ?? 0
  const maeTudo = tudo.metricas.mae ?? 0
  const diasTeste = resposta.teste.dias
  // O Chronos-2 não é treinado com os nossos dados: ele só "vê" o histórico (D47). As frases
  // dizem "viu" em vez de "treinado" para não afirmar algo falso (D46).
  const semTreino = antes.modelo === 'chronos'
  const soAntes = semTreino ? 'que só viu os dias anteriores' : 'treinado só com os dias anteriores'
  const comTudo = semTreino ? 'que viu todos os dias' : 'treinado com todos os dias'

  let texto = `A partir de ${formatarData(resposta.data_mudanca)}, a temperatura média passou a ficar mais ${subiu ? 'alta' : 'baixa'} que antes. `
  if (maeTudo > 0 && maeAntes > maeTudo * LIMITE_PIOROU) {
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
