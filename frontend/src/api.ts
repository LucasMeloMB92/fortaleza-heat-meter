// Tipos das respostas da API (espelham docs/api.md) e funções que fazem os pedidos.
// Datas chegam no padrão técnico AAAA-MM-DD; a conversão para DD-MM-AAAA é só na exibição
// (formatacao.ts — decisão D41).

export type Variavel = 'temperatura' | 'sensacao'
export type Modelo = 'linha_base' | 'ets' | 'sarima' | 'prophet'
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
}

export interface Opcoes {
  variaveis: { id: Variavel; nome: string; unidade: string }[]
  modelos: { id: Modelo; nome: string }[]
  padroes: { variavel: Variavel; modelo: Modelo }
  horizonte: { padrao: number; minimo: number; maximo: number }
  nivel_intervalo: number
}

export interface Saude {
  status: string
  dados: Periodo
}

export interface Serie {
  variavel: Variavel
  nome: string
  unidade: string
  periodo: Periodo
  dados: Ponto[]
}

export interface RespostaPrevisao {
  variavel: Variavel
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
  variavel: Variavel
  teste: Periodo
  metricas: LinhaMetricas[]
}

export interface DiaTeste extends PontoPrevisto {
  real: number | null
  erro: number | null
  dentro_da_faixa: boolean
}

export interface RespostaTeste {
  variavel: Variavel
  modelo: Modelo
  nome_modelo: string
  configuracao: string | null
  teste: Periodo
  metricas: Metricas
  treino_final: Ponto[]
  dias: DiaTeste[]
}

export interface RespostaCasoEstudo {
  variavel: Variavel
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

  let resposta: Response
  try {
    resposta = await fetch(url)
  } catch {
    throw new ErroApi('Não foi possível conectar à API. O backend está rodando na porta 5000?', 0)
  }
  if (!resposta.ok) {
    // A API sempre devolve {"erro": "..."}; se não vier JSON (ex.: proxy sem backend), mensagem genérica.
    const corpo = await resposta.json().catch(() => null)
    throw new ErroApi(corpo?.erro ?? `A API respondeu com erro ${resposta.status}.`, resposta.status)
  }
  return resposta.json() as Promise<T>
}

export const api = {
  saude: () => buscar<Saude>('saude'),
  opcoes: () => buscar<Opcoes>('opcoes'),
  serie: (variavel: Variavel) => buscar<Serie>('serie', { variavel }),
  previsao: (variavel: Variavel, modelo: Modelo, horizonte: number) =>
    buscar<RespostaPrevisao>('previsao', { variavel, modelo, horizonte }),
  metricas: (variavel: Variavel) => buscar<RespostaMetricas>('metricas', { variavel }),
  teste: (variavel: Variavel, modelo: Modelo) => buscar<RespostaTeste>('teste', { variavel, modelo }),
  casoEstudo: (variavel: Variavel, modelo: Modelo) =>
    buscar<RespostaCasoEstudo>('caso-estudo', { variavel, modelo }),
}
