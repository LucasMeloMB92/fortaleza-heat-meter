// Gráfico principal: histórico (linha cheia) + previsão (tracejada) + faixa de 95% (sombra).
// Opção: janela de 30 ou 90 dias.
import { useState } from 'react'
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
import type { RespostaPrevisao } from '../api'
import { COR_GRADE, COR_TEMPERATURA } from '../cores'
import { formatarData, formatarGraus } from '../formatacao'
import { DicaGrafico } from './DicaGrafico'
import { MARGEM_GRAFICO, PROPS_EIXO_X, PROPS_EIXO_Y } from './eixos'

interface Linha {
  data: string
  real?: number | null
  previsao?: number | null
  faixa?: [number | null, number | null]
}

/** Junta histórico e previsão numa lista por data. */
function montarLinhas(resposta: RespostaPrevisao, dias: number): Linha[] {
  const historico = resposta.historico.slice(-dias)
  const linhas: Linha[] = historico.map((p) => ({ data: p.data, real: p.valor }))
  // Liga o último dia real ao primeiro previsto, para a linha tracejada não começar "solta".
  const ultima = linhas.at(-1)
  if (ultima) ultima.previsao = ultima.real
  for (const p of resposta.previsao) {
    linhas.push({ data: p.data, previsao: p.previsao, faixa: [p.inferior, p.superior] })
  }
  return linhas
}

export function GraficoPrevisao(props: { resposta: RespostaPrevisao }) {
  const [dias, setDias] = useState(30)
  const { resposta } = props
  const cor = COR_TEMPERATURA
  const linhas = montarLinhas(resposta, dias)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex overflow-hidden rounded-md border border-borda">
          {[30, 90].map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={dias === d}
              onClick={() => setDias(d)}
              className={`px-3 py-1 ${dias === d ? 'bg-tinta text-white' : 'bg-white text-tinta-2'}`}
            >
              Últimos {d} dias
            </button>
          ))}
        </div>
      </div>

      <div
        className="h-80"
        role="img"
        aria-label={`Gráfico de ${resposta.nome_modelo}: histórico e previsão de ${resposta.horizonte} dias`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={linhas} margin={MARGEM_GRAFICO}>
            <CartesianGrid stroke={COR_GRADE} vertical={false} />
            <XAxis {...PROPS_EIXO_X} />
            <YAxis {...PROPS_EIXO_Y} />
            <Tooltip content={<DicaGrafico />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              dataKey="faixa"
              name="Faixa de 95%"
              fill={cor}
              fillOpacity={0.18}
              stroke="none"
              isAnimationActive={false}
            />
            <Line
              dataKey="real"
              name="Real"
              stroke={cor}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="previsao"
              name={`Previsão (${resposta.nome_modelo})`}
              stroke={cor}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* A mesma previsão em tabela: para ler os números com precisão. */}
      <table className="mt-4 w-full text-sm">
        <caption className="mb-1 text-left text-xs text-tinta-2">
          Valores previstos — faixa de 95%: o valor real deve cair entre o mínimo e o máximo.
        </caption>
        <thead>
          <tr className="border-b border-borda text-left text-xs uppercase text-tinta-2">
            <th className="py-1 font-medium">Data</th>
            <th className="py-1 text-right font-medium">Previsão</th>
            <th className="py-1 text-right font-medium">Mínimo</th>
            <th className="py-1 text-right font-medium">Máximo</th>
          </tr>
        </thead>
        <tbody>
          {resposta.previsao.map((p) => (
            <tr key={p.data} className="border-b border-borda/60 tabular-nums">
              <td className="py-1">{formatarData(p.data)}</td>
              <td className="py-1 text-right font-medium">{formatarGraus(p.previsao)}</td>
              <td className="py-1 text-right text-tinta-2">{formatarGraus(p.inferior)}</td>
              <td className="py-1 text-right text-tinta-2">{formatarGraus(p.superior)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
