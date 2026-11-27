// Caso de estudo (quebra estrutural): o mesmo modelo treinado só ANTES da mudança, com TUDO e
// só DEPOIS — todos comparados no mesmo período de teste (decisão D35).
// Um card só (D53): em cima, a tabela com TODOS os modelos (CasoEstudoGeral); embaixo, o gráfico
// e os cenários do modelo escolhido — filtrado aqui da mesma resposta, sem outra consulta.
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
import type { Cenario, Modelo, RespostaCasoEstudo } from '../api'
import { COR_GRADE, COR_REAL, COR_TEXTO_2, corCenario } from '../cores'
import { formatarComSinal, formatarData, formatarGraus } from '../formatacao'
import { AJUDA, textoCasoEstudo } from '../textos'
import { Ajuda } from './Ajuda'
import { CasoEstudoGeral } from './CasoEstudoGeral'
import { Detalhes } from './Detalhes'
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

export function CasoEstudo(props: {
  resposta: RespostaCasoEstudo
  modelo: Modelo
  aoSelecionar: (m: Modelo) => void
}) {
  // Só os resultados do modelo escolhido: o texto, o gráfico e a tabela de cenários são dele.
  const resposta = { ...props.resposta, resultados: props.resposta.resultados.filter((r) => r.modelo === props.modelo) }
  const nomeModelo = resposta.resultados[0]?.nome_modelo ?? ''
  const metricasPorCenario = new Map(resposta.resultados.map((r) => [r.cenario, r.metricas]))
  const estilo: Record<Cenario, { tracejado: string; faixa: boolean }> = {
    so_antes: { tracejado: '6 4', faixa: true },
    tudo: { tracejado: '6 4', faixa: true },
    so_depois: { tracejado: '2 3', faixa: false },
  }

  return (
    <div>
      <CasoEstudoGeral resposta={props.resposta} modeloSelecionado={props.modelo} aoSelecionar={props.aoSelecionar} />

      <h3 className="mt-6 border-t border-borda pt-4 text-sm font-semibold">Em detalhe: {nomeModelo}</h3>
      {/* "O que isso significa", com os números reais (D46) — antes do gráfico, para ler primeiro. */}
      <p className="mb-4 mt-2 rounded-md bg-plano p-3 text-sm leading-relaxed">
        <strong>O que isso significa:</strong> {textoCasoEstudo(resposta)}
      </p>
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
                    fill={corCenario(c.id)}
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
                stroke={corCenario(c.id)}
                strokeWidth={2}
                strokeDasharray={estilo[c.id].tracejado}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <Detalhes rotulo={`Ver os números dos 3 cenários do ${nomeModelo}`}>
        <table className="w-full text-sm">
          <caption className="mb-1 text-left text-xs text-tinta-2">
            Erro de cada cenário no período de teste ({formatarData(resposta.teste.inicio)} a{' '}
            {formatarData(resposta.teste.fim)}).
          </caption>
          <thead>
            <tr className="border-b border-borda text-left text-xs uppercase text-tinta-2">
              <th className="py-1 font-medium">Cenário de treino</th>
              <th className="py-1 font-medium">Treinou com</th>
              <th className="py-1 text-right font-medium">Nível médio no treino</th>
              <th className="py-1 text-right font-medium">
                Erro médio
                <Ajuda rotulo="erro médio" texto={AJUDA.erroMedio} />
              </th>
              <th className="py-1 text-right font-medium">
                Errou para
                <Ajuda rotulo="viés" texto={AJUDA.vies} />
              </th>
              <th className="py-1 text-right font-medium">
                Acertou a faixa
                <Ajuda rotulo="acertou a faixa" texto={AJUDA.acertouFaixa} />
              </th>
            </tr>
          </thead>
          <tbody>
            {resposta.cenarios.map((c) => {
              const m = metricasPorCenario.get(c.id)
              const vies = m?.vies ?? 0
              const acertos = Math.round(((m?.cobertura ?? 0) / 100) * resposta.teste.dias)
              return (
                <tr key={c.id} className="border-b border-borda/60 tabular-nums">
                  <td className="py-1">
                    <span
                      className="mr-2 inline-block h-2 w-2 rounded-full"
                      style={{ background: corCenario(c.id) }}
                    />
                    {c.nome}
                  </td>
                  <td className="py-1 text-tinta-2">
                    {formatarData(c.inicio)} a {formatarData(c.fim)} ({c.dias} dias)
                  </td>
                  <td className="py-1 text-right">{formatarGraus(c.media_treino)}</td>
                  <td className="py-1 text-right font-medium">{formatarGraus(m?.mae)}</td>
                  <td className="py-1 text-right">
                    {Math.abs(vies) < 0.1 ? 'quase nada' : `${vies < 0 ? 'baixo' : 'cima'} (${formatarComSinal(vies, ' °C', 1)})`}
                  </td>
                  <td className="py-1 text-right">
                    {acertos} de {resposta.teste.dias} dias
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Detalhes>
    </div>
  )
}
