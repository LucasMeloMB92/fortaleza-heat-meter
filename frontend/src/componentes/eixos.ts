// Configuração dos eixos, igual em todos os gráficos (um lugar só para mudar).
// Datas em DD-MM-AAAA (D41) e temperaturas com vírgula e "°C" na mesma linha.
import { COR_EIXO } from '../cores'
import { formatarData, formatarNumero } from '../formatacao'

const ESTILO_TEXTO = { fontSize: 12, fill: COR_EIXO }

export const PROPS_EIXO_X = {
  dataKey: 'data',
  tickFormatter: formatarData,
  minTickGap: 40, // espaço mínimo entre datas, para não sobrepor
  tick: ESTILO_TEXTO,
  stroke: COR_EIXO,
}

export const PROPS_EIXO_Y = {
  domain: ['auto', 'auto'] as [string, string],
  tickFormatter: (valor: number) => `${formatarNumero(valor, 1)} °C`,
  tick: ESTILO_TEXTO,
  stroke: COR_EIXO,
  width: 64, // largo o bastante para "29,5 °C" caber numa linha
}

export const MARGEM_GRAFICO = { top: 8, right: 16, bottom: 8, left: 0 }
