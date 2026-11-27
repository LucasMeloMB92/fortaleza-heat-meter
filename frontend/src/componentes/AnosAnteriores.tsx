// Aba "Anos anteriores" da visão geral (D50): o período de agora comparado com o mesmo período
// do calendário nos anos anteriores — separa o que é estação do ano do que é anomalia.
// É sobre os DADOS (não sobre os modelos) e explica de onde vem a data do caso de estudo.
import { lazy } from 'react'
import type { RespostaContexto } from '../api'
import { formatarComSinal, formatarData, formatarGraus } from '../formatacao'
import { AJUDA, textoAnosAnteriores } from '../textos'
import { Ajuda } from './Ajuda'

// Gráfico sob demanda (D45): o Suspense do Cartao mostra o esqueleto enquanto o código chega.
const GraficoAnos = lazy(() => import('./GraficoAnos').then((m) => ({ default: m.GraficoAnos })))

export function AnosAnteriores(props: { resposta: RespostaContexto }) {
  const { resposta } = props
  const th = 'whitespace-nowrap py-2 pl-3 text-right font-medium'
  const num = 'whitespace-nowrap py-2 pl-3 text-right'
  return (
    <div>
      <h3 className="text-sm font-semibold">{resposta.nome}</h3>
      <p className="mb-2 mt-1 text-sm leading-relaxed">{textoAnosAnteriores(resposta)}</p>
      <GraficoAnos resposta={resposta} />
      <div className="overflow-x-auto">
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b border-borda text-left text-xs uppercase text-tinta-2">
              <th className="py-2 font-medium">Ano</th>
              <th className={th}>Período</th>
              <th className={th}>Média</th>
              <th className={th}>
                Subida no período
                <Ajuda rotulo="subida no período" texto={AJUDA.subidaPeriodo} />
              </th>
            </tr>
          </thead>
          <tbody>
            {resposta.anos.map((a) => {
              const atual = a.ano === resposta.ano_atual
              return (
                <tr key={a.ano} className={`border-b border-borda/60 tabular-nums ${atual ? 'font-semibold' : ''}`}>
                  <td className="py-2">{a.ano}</td>
                  <td className={num}>
                    {formatarData(a.inicio).slice(0, 5)} a {formatarData(a.fim).slice(0, 5)}
                  </td>
                  <td className={num}>{formatarGraus(a.media)}</td>
                  <td className={num}>{formatarComSinal(a.subida)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm tabular-nums">
        <span className="text-tinta-2">
          Diferença para o normal
          <Ajuda rotulo="diferença para o normal (anomalia)" texto={AJUDA.anomalia} />:
        </span>{' '}
        {formatarComSinal(resposta.anomalia_media)} no período · {formatarComSinal(resposta.anomalia_recente)} nos
        últimos {resposta.dias_anomalia_recente} dias
      </p>
      <p className="mt-3 text-xs text-tinta-3">
        Mesmo período do calendário em cada ano. "Normal" = média de {resposta.anos_anteriores.join(' e ')} no mesmo
        dia (suavizada em 7 dias). Estes dados servem só para entender a série: os modelos continuam usando só os
        últimos 90 dias. A data do degrau é a mesma usada no caso de estudo.
      </p>
    </div>
  )
}
