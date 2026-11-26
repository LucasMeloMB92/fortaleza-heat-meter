// Gráfico da aba "Anos anteriores" (D50): o mesmo período do calendário em cada ano, no mesmo
// eixo. Padrão D25: anos anteriores em cinza, só o ano atual na cor da variável; o "normal"
// (média dos anos anteriores) tracejado; linha vertical na data do degrau.
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { VariavelContexto } from '../api'
import { COR_GRADE, COR_TEXTO_2, COR_VARIAVEL } from '../cores'
import { formatarData } from '../formatacao'
import { DicaGrafico } from './DicaGrafico'
import { MARGEM_GRAFICO, PROPS_EIXO_X, PROPS_EIXO_Y } from './eixos'

// Do ano mais antigo ao mais recente: cinza claro -> cinza escuro.
const CINZAS = ['#c4c2bc', '#898781']

export function GraficoAnos(props: { variavel: VariavelContexto; anoAtual: number; anosAnteriores: number[] }) {
  const { variavel } = props
  // Recharts precisa de uma linha por dia com uma chave por série: { data, "2024": 27,3, ... }.
  const linhas = variavel.dias.map((d) => ({ data: d.data, ...d.valores, normal: d.normal }))
  const anteriores = props.anosAnteriores.map(String)

  return (
    <div className="h-64" role="img" aria-label={`${variavel.nome}: mesmo período em cada ano`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={linhas} margin={MARGEM_GRAFICO}>
          <CartesianGrid stroke={COR_GRADE} vertical={false} />
          <XAxis {...PROPS_EIXO_X} tickFormatter={(d: string) => formatarData(d).slice(0, 5)} />
          <YAxis {...PROPS_EIXO_Y} />
          <Tooltip content={<DicaGrafico />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {anteriores.map((ano, i) => (
            <Line
              key={ano}
              dataKey={ano}
              name={ano}
              stroke={CINZAS[Math.min(i, CINZAS.length - 1)]}
              strokeWidth={1.2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
          <Line
            dataKey="normal"
            name={`Normal (média ${anteriores.join(' e ')})`}
            stroke={COR_TEXTO_2}
            strokeDasharray="5 4"
            strokeWidth={1.2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey={String(props.anoAtual)}
            name={String(props.anoAtual)}
            stroke={COR_VARIAVEL[variavel.id]}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceLine
            x={variavel.mudanca.data}
            stroke={COR_TEXTO_2}
            strokeDasharray="2 3"
            label={{ value: `degrau ${formatarData(variavel.mudanca.data).slice(0, 5)}`, fontSize: 11, fill: COR_TEXTO_2, position: 'insideTopLeft' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
