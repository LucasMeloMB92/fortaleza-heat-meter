// Previsão x real no período de teste: fim do treino (cor), previsão tracejada + faixa,
// real em preto — ● dentro da faixa, ✕ fora (mesma convenção do gráfico da etapa 4).
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RespostaTeste } from '../api'
import { COR_GRADE, COR_REAL, COR_TEMPERATURA } from '../cores'
import { DicaGrafico } from './DicaGrafico'
import { MARGEM_GRAFICO, PROPS_EIXO_X, PROPS_EIXO_Y } from './eixos'

interface Linha {
  data: string
  treino?: number | null
  real?: number | null
  previsao?: number | null
  faixa?: [number | null, number | null]
  dentro?: boolean
}

function montarLinhas(resposta: RespostaTeste): Linha[] {
  const linhas: Linha[] = resposta.treino_final.map((p) => ({ data: p.data, treino: p.valor }))
  const ultima = linhas.at(-1)
  if (ultima) ultima.previsao = ultima.treino // liga treino e previsão
  for (const d of resposta.dias) {
    linhas.push({
      data: d.data,
      real: d.real,
      previsao: d.previsao,
      faixa: [d.inferior, d.superior],
      dentro: d.dentro_da_faixa,
    })
  }
  return linhas
}

/** Marcador do valor real: círculo se caiu dentro da faixa, "x" se caiu fora. */
function MarcadorReal(props: { cx?: number; cy?: number; payload?: Linha }) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null || payload?.real == null) return <g />
  if (payload.dentro) return <circle cx={cx} cy={cy} r={4} fill={COR_REAL} />
  return (
    <g stroke={COR_REAL} strokeWidth={2}>
      <line x1={cx - 4} y1={cy - 4} x2={cx + 4} y2={cy + 4} />
      <line x1={cx - 4} y1={cy + 4} x2={cx + 4} y2={cy - 4} />
    </g>
  )
}

export function GraficoTeste(props: { resposta: RespostaTeste }) {
  const { resposta } = props
  const cor = COR_TEMPERATURA

  return (
    <div
      className="h-72"
      role="img"
      aria-label={`Previsão de ${resposta.nome_modelo} comparada aos valores reais no período de teste`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={montarLinhas(resposta)} margin={MARGEM_GRAFICO}>
          <CartesianGrid stroke={COR_GRADE} vertical={false} />
          <XAxis {...PROPS_EIXO_X} />
          <YAxis {...PROPS_EIXO_Y} />
          <Tooltip content={<DicaGrafico />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area dataKey="faixa" name="Faixa de 95%" fill={cor} fillOpacity={0.18} stroke="none" isAnimationActive={false} />
          <Line dataKey="treino" name="Treino (real)" stroke={cor} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line
            dataKey="previsao"
            name="Previsão"
            stroke={cor}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="real"
            name="Real no teste (● dentro, ✕ fora da faixa)"
            stroke={COR_REAL}
            strokeOpacity={0.5}
            strokeWidth={1}
            dot={(p) => <MarcadorReal key={p.index} cx={p.cx} cy={p.cy} payload={p.payload as Linha} />}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
