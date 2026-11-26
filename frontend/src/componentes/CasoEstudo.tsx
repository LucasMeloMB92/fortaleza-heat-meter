// Caso de estudo (quebra estrutural): o mesmo modelo treinado só ANTES da mudança, com TUDO e
// só DEPOIS — todos comparados no mesmo período de teste (decisão D35).
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Cenario, RespostaCasoEstudo } from '../api'
import { COR_GRADE, COR_REAL, COR_TEXTO_2, corCenario } from '../cores'
import { formatarComSinal, formatarData, formatarGraus, formatarPorcentagem } from '../formatacao'
import { DicaGrafico } from './DicaGrafico'
import { PROPS_EIXO_X, PROPS_EIXO_Y } from './eixos'

const INICIO_GRAFICO = 50 // mostra os últimos 50 dias reais (algumas semanas antes da mudança)

type Linha = { data: string; real?: number | null } & Partial<Record<Cenario, number | null>> &
  Partial<Record<`faixa_${Cenario}`, [number | null, number | null]>>

function montarLinhas(resposta: RespostaCasoEstudo): Linha[] {
  const porData = new Map<string, Linha>()
  for (const p of resposta.real.slice(-INICIO_GRAFICO)) porData.set(p.data, { data: p.data, real: p.valor })
  for (const r of resposta.resultados) {
    for (const p of r.previsao) {
      const linha = porData.get(p.data) ?? { data: p.data }
      linha[r.cenario] = p.previsao
      linha[`faixa_${r.cenario}`] = [p.inferior, p.superior]
      porData.set(p.data, linha)
    }
  }
  return [...porData.values()].sort((a, b) => a.data.localeCompare(b.data))
}

export function CasoEstudo(props: { resposta: RespostaCasoEstudo }) {
  const { resposta } = props
  const variavel = resposta.variavel
  const metricasPorCenario = new Map(resposta.resultados.map((r) => [r.cenario, r.metricas]))
  const estilo: Record<Cenario, { tracejado: string; faixa: boolean }> = {
    so_antes: { tracejado: '6 4', faixa: true },
    tudo: { tracejado: '6 4', faixa: true },
    so_depois: { tracejado: '2 3', faixa: false },
  }

  return (
    <div>
      <div className="h-80" role="img" aria-label="Previsões treinadas antes, com tudo e depois da mudança">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={montarLinhas(resposta)} margin={{ top: 20, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke={COR_GRADE} vertical={false} />
            <XAxis {...PROPS_EIXO_X} />
            <YAxis {...PROPS_EIXO_Y} />
            <Tooltip content={<DicaGrafico />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceArea
              x1={resposta.teste.inicio}
              x2={resposta.teste.fim}
              fill={COR_GRADE}
              fillOpacity={0.6}
              label={{ value: 'teste', position: 'insideTop', fill: COR_TEXTO_2, fontSize: 11 }}
            />
            <ReferenceLine
              x={resposta.data_mudanca}
              stroke={COR_TEXTO_2}
              strokeDasharray="2 2"
              label={{
                value: `mudança ${formatarData(resposta.data_mudanca)}`,
                position: 'top',
                fill: COR_TEXTO_2,
                fontSize: 11,
              }}
            />
            {resposta.cenarios.map(
              (c) =>
                estilo[c.id].faixa && (
                  <Area
                    key={`faixa_${c.id}`}
                    dataKey={`faixa_${c.id}`}
                    name={`Faixa 95% — ${c.nome.toLowerCase()}`}
                    legendType="none"
                    fill={corCenario(c.id, variavel)}
                    fillOpacity={0.12}
                    stroke="none"
                    isAnimationActive={false}
                  />
                ),
            )}
            <Line dataKey="real" name="Real" stroke={COR_REAL} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            {resposta.cenarios.map((c) => (
              <Line
                key={c.id}
                dataKey={c.id}
                name={c.nome}
                stroke={corCenario(c.id, variavel)}
                strokeWidth={2}
                strokeDasharray={estilo[c.id].tracejado}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <table className="mt-4 w-full text-sm">
        <caption className="mb-1 text-left text-xs text-tinta-2">
          Erro de cada cenário no período de teste ({formatarData(resposta.teste.inicio)} a{' '}
          {formatarData(resposta.teste.fim)}).
        </caption>
        <thead>
          <tr className="border-b border-borda text-left text-xs uppercase text-tinta-2">
            <th className="py-1 font-medium">Cenário de treino</th>
            <th className="py-1 font-medium">Período</th>
            <th className="py-1 text-right font-medium">Média do treino</th>
            <th className="py-1 text-right font-medium">MAE</th>
            <th className="py-1 text-right font-medium">Viés</th>
            <th className="py-1 text-right font-medium">Cobertura</th>
          </tr>
        </thead>
        <tbody>
          {resposta.cenarios.map((c) => {
            const m = metricasPorCenario.get(c.id)
            return (
              <tr key={c.id} className="border-b border-borda/60 tabular-nums">
                <td className="py-1">
                  <span
                    className="mr-2 inline-block h-2 w-2 rounded-full"
                    style={{ background: corCenario(c.id, variavel) }}
                  />
                  {c.nome}
                </td>
                <td className="py-1 text-tinta-2">
                  {formatarData(c.inicio)} a {formatarData(c.fim)} ({c.dias} dias)
                </td>
                <td className="py-1 text-right">{formatarGraus(c.media_treino)}</td>
                <td className="py-1 text-right font-medium">{formatarGraus(m?.mae)}</td>
                <td className="py-1 text-right">{formatarComSinal(m?.vies)}</td>
                <td className="py-1 text-right">{formatarPorcentagem(m?.cobertura)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <p className="mt-4 rounded-md bg-plano p-3 text-sm text-tinta-2">
        <strong className="text-tinta">Como ler:</strong> o modelo treinado <em>só antes</em> da mudança
        de {formatarData(resposta.data_mudanca)} não conhece o novo nível — costuma prever abaixo do real
        (viés negativo) e, mesmo assim, com uma faixa confiante. O remédio para mudanças assim é{' '}
        <strong className="text-tinta">retreinar com frequência</strong> com os dados mais recentes.
      </p>
    </div>
  )
}
