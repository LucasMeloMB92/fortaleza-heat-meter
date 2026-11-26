// Formatação para EXIBIÇÃO (decisão D41): datas em DD-MM-AAAA e números no padrão brasileiro.
// A API continua usando AAAA-MM-DD; só o que aparece na tela passa por aqui.

/**
 * "2026-11-25" -> "25-11-2026".
 *
 * Trabalhamos com o texto em vez de `new Date(...)` de propósito: `new Date("2026-11-25")`
 * é interpretado em UTC e, no fuso de Fortaleza (UTC-3), viraria 24/11 às 21h — o dia errado.
 */
export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  if (!ano || !mes || !dia) return iso // formato inesperado: mostra como veio
  return `${dia}-${mes}-${ano}`
}

/** "2026-11-25" -> "25-11" (só para eixos com pouco espaço; o tooltip mostra a data completa). */
export function formatarDiaMes(iso: string): string {
  return formatarData(iso).slice(0, 5)
}

const numeroBr = (casas: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

/** 29.1 -> "29,10". null -> "—". */
export function formatarNumero(valor: number | null | undefined, casas = 2): string {
  return valor == null ? '—' : numeroBr(casas).format(valor)
}

/** 29.1 -> "29,10 °C". */
export function formatarGraus(valor: number | null | undefined, casas = 2): string {
  return valor == null ? '—' : `${formatarNumero(valor, casas)} °C`
}

/** -0.24 -> "−0,24 °C"; 0.19 -> "+0,19 °C" (sinal sempre visível, para erros e viés). */
export function formatarComSinal(valor: number | null | undefined, unidade = ' °C', casas = 2): string {
  if (valor == null) return '—'
  const sinal = valor > 0 ? '+' : valor < 0 ? '−' : ''
  return `${sinal}${formatarNumero(Math.abs(valor), casas)}${unidade}`
}

/** 90 -> "90%". */
export function formatarPorcentagem(valor: number | null | undefined): string {
  return valor == null ? '—' : `${formatarNumero(valor, 0)}%`
}
