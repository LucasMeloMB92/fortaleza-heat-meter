// Gráfico da aba "Anos anteriores" (D50): o mesmo período do calendário em cada ano, no mesmo
// eixo. Padrão D25: anos anteriores em cinza, só o ano atual na cor da temperatura; o "normal"
// (média dos anos anteriores) tracejado; linha vertical na data do degrau.
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { RespostaContexto } from '../api'
import { COR_GRADE, COR_TEMPERATURA, COR_TEXTO_2 } from '../cores'
import { formatarData } from '../formatacao'
import { DicaGrafico } from './DicaGrafico'
import { MARGEM_GRAFICO, PROPS_EIXO_X, PROPS_EIXO_Y } from './eixos'

// Do ano mais antigo ao mais recente: cinza claro -> cinza escuro.
const CINZAS = ['#c4c2bc', '#898781']

export function GraficoAnos(props: { resposta: RespostaContexto }) {
  const { resposta } = props
  // Recharts precisa de uma linha por dia com uma chave por série: { data, "2024": 27,3, ... }.
  const linhas = resposta.dias.map((d) => ({ data: d.data, ...d.valores, normal: d.normal }))
  const anteriores = resposta.anos_anteriores.map(String)

  return (
    <div className="h-64" role="img" aria-label={`${resposta.nome}: mesmo período em cada ano`}>
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
            dataKey={String(resposta.ano_atual)}
            name={String(resposta.ano_atual)}
            stroke={COR_TEMPERATURA}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceLine
            x={resposta.mudanca.data}
            stroke={COR_TEXTO_2}
            strokeDasharray="2 3"
            label={{ value: `degrau ${formatarData(resposta.mudanca.data).slice(0, 5)}`, fontSize: 11, fill: COR_TEXTO_2, position: 'insideTopLeft' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
