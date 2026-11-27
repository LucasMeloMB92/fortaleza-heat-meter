// Tipos das respostas da API (espelham docs/api.md) e funções que fazem os pedidos.
// Datas chegam no padrão técnico AAAA-MM-DD; a conversão para DD-MM-AAAA é só na exibição
// (formatacao.ts — decisão D41).

export type Modelo = 'linha_base' | 'ets' | 'sarima' | 'prophet' | 'chronos'
export type Cenario = 'so_antes' | 'tudo' | 'so_depois'

export interface Ponto {
  data: string
  valor: number | null
}

export interface PontoPrevisto {
  data: string
  previsao: number | null
  inferior: number | null
  superior: number | null
}

export interface Periodo {
  inicio: string
  fim: string
  dias: number
}

export interface Metricas {
  mae: number | null
  rmse: number | null
  cobertura: number | null
  mae_dias_1_7: number | null
  vies: number | null
  // Largura média da faixa, em °C (D48). Opcional: versões antigas da API não mandam.
  largura_faixa?: number | null
}

export interface Opcoes {
  serie: { nome: string; unidade: string } // uma série só: a temperatura média (D52)
  modelos: { id: Modelo; nome: string }[]
  padroes: { modelo: Modelo }
  horizonte: { padrao: number; minimo: number; maximo: number }
  nivel_intervalo: number
}

export interface Saude {
  status: string
  dados: Periodo
  // Atualização automática (D44): os dados vão até ontem? Se não, o motivo.
  // Opcional: versões antigas da API não mandam este campo.
  atualizacao?: {
    em_dia: boolean
    ultimo_dia_esperado: string
    atualizado_em: string | null
    erro: string | null
  }
}

export interface RespostaPrevisao {
  modelo: Modelo
  nome_modelo: string
  horizonte: number
  nivel_intervalo: number
  configuracao: string | null
  historico: Ponto[]
  previsao: PontoPrevisto[]
}

export interface LinhaMetricas extends Metricas {
  modelo: Modelo
  nome_modelo: string
  configuracao: string | null
  mae_vs_linha_base: number | null
}

export interface RespostaMetricas {
  teste: Periodo
  metricas: LinhaMetricas[]
}

export interface DiaTeste extends PontoPrevisto {
  real: number | null
  erro: number | null
  dentro_da_faixa: boolean
}

export interface RespostaTeste {
  modelo: Modelo
  nome_modelo: string
  configuracao: string | null
  teste: Periodo
  metricas: Metricas
  treino_final: Ponto[]
  dias: DiaTeste[]
}

export interface RespostaCasoEstudo {
  data_mudanca: string
  teste: Periodo
  cenarios: ({ id: Cenario; nome: string; media_treino: number | null } & Periodo)[]
  real: Ponto[]
  resultados: {
    cenario: Cenario
    modelo: Modelo
    nome_modelo: string
    horizonte: number
    metricas: Metricas
    previsao: PontoPrevisto[]
  }[]
}

/** /api/contexto (D50): o período de agora comparado com o mesmo período dos anos anteriores. */
export interface AnoContexto {
  ano: number
  inicio: string
  fim: string
  dias: number
  media: number | null
  subida: number | null // média dos últimos 15 dias − média dos primeiros 15
}

export interface DiaContexto {
  data: string // dia do período atual (os anos anteriores são "transportados" para ele)
  valores: Record<string, number | null> // ano -> valor naquele dia do calendário
  normal: number | null // média dos anos anteriores no mesmo dia (suavizada)
  anomalia: number | null // valor de agora − normal
}

export interface RespostaContexto {
  nome: string
  ano_atual: number
  anos_anteriores: number[]
  dias_subida: number
  dias_anomalia_recente: number
  anos: AnoContexto[]
  anomalia_media: number | null
  anomalia_recente: number | null // últimos dias (período de teste)
  mudanca: { data: string; anomalia_antes: number; anomalia_depois: number }
  dias: DiaContexto[]
}

/** Erro devolvido pela API (o corpo JSON traz a mensagem em português — D40). */
export class ErroApi extends Error {
  status: number
  constructor(mensagem: string, status: number) {
    super(mensagem)
    this.status = status
  }
}

/** Faz um GET em /api/<rota> com os parâmetros dados e devolve o JSON já tipado. */
async function buscar<T>(rota: string, parametros: Record<string, string | number> = {}): Promise<T> {
  const consulta = new URLSearchParams(
    Object.entries(parametros).map(([chave, valor]) => [chave, String(valor)]),
  )
  const url = `/api/${rota}${consulta.size ? `?${consulta}` : ''}`

  const semConexao = 'Não foi possível conectar à API. O backend está rodando na porta 5000?'
  let resposta: Response
  try {
    resposta = await fetch(url)
  } catch {
    throw new ErroApi(semConexao, 0)
  }
  if (!resposta.ok) {
    // A API sempre devolve {"erro": "..."} em JSON. Se não vier JSON, quem respondeu foi o
    // proxy do Vite: 502/503/504 = ele não alcançou o backend (servidor desligado).
    const corpo = await resposta.json().catch(() => null)
    if (corpo?.erro) throw new ErroApi(corpo.erro, resposta.status)
    const proxySemBackend = [502, 503, 504].includes(resposta.status)
    throw new ErroApi(
      proxySemBackend ? semConexao : `A API respondeu com erro ${resposta.status}.`,
      resposta.status,
    )
  }
  return resposta.json() as Promise<T>
}

export const api = {
  saude: () => buscar<Saude>('saude'),
  opcoes: () => buscar<Opcoes>('opcoes'),
  previsao: (modelo: Modelo, horizonte: number) =>
    buscar<RespostaPrevisao>('previsao', { modelo, horizonte }),
  metricas: () => buscar<RespostaMetricas>('metricas'),
  teste: (modelo: Modelo) => buscar<RespostaTeste>('teste', { modelo }),
  contexto: () => buscar<RespostaContexto>('contexto'),
  // Sem `modelo`, a API devolve os resultados de TODOS os modelos (aba "Caso de estudo" da visão geral).
  casoEstudo: (modelo?: Modelo) => buscar<RespostaCasoEstudo>('caso-estudo', modelo ? { modelo } : {}),
}
