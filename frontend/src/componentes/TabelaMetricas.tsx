// Tabela comparando os 4 modelos no período de teste. Clicar numa linha seleciona o modelo.
import type { Modelo, RespostaMetricas } from '../api'
import { formatarComSinal, formatarGraus, formatarPorcentagem } from '../formatacao'

export function TabelaMetricas(props: {
  resposta: RespostaMetricas
  modeloSelecionado: Modelo
  aoSelecionar: (m: Modelo) => void
}) {
  const linhas = props.resposta.metricas
  const menorMae = Math.min(...linhas.map((l) => l.mae ?? Infinity))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-borda text-left text-xs uppercase text-tinta-2">
            <th className="py-2 font-medium">Modelo</th>
            <th className="py-2 text-right font-medium" title="Erro médio, em °C (menor = melhor)">
              MAE
            </th>
            <th className="py-2 text-right font-medium" title="Como o MAE, mas pesa mais os erros grandes">
              RMSE
            </th>
            <th className="py-2 text-right font-medium" title="% dos dias reais dentro da faixa de 95%">
              Cobertura
            </th>
            <th className="py-2 text-right font-medium" title="Erro médio com sinal: negativo = previu baixo">
              Viés
            </th>
            <th
              className="py-2 text-right font-medium"
              title="Quanto erra a menos (−) ou a mais (+) que a linha de base"
            >
              vs linha de base
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => {
            const selecionado = l.modelo === props.modeloSelecionado
            const melhor = l.mae === menorMae
            return (
              <tr
                key={l.modelo}
                className={`border-b border-borda/60 tabular-nums ${selecionado ? 'bg-plano' : ''}`}
              >
                <td className="py-2">
                  <button
                    type="button"
                    onClick={() => props.aoSelecionar(l.modelo)}
                    aria-pressed={selecionado}
                    className="text-left"
                  >
                    <span className={selecionado ? 'font-semibold' : 'underline decoration-dotted'}>
                      {l.nome_modelo}
                    </span>
                    {melhor && (
                      <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800">
                        menor erro
                      </span>
                    )}
                    <span className="block text-xs text-tinta-3">{l.configuracao}</span>
                  </button>
                </td>
                <td className={`py-2 text-right ${melhor ? 'font-semibold' : ''}`}>
                  {formatarGraus(l.mae)}
                </td>
                <td className="py-2 text-right">{formatarGraus(l.rmse)}</td>
                <td className="py-2 text-right">{formatarPorcentagem(l.cobertura)}</td>
                <td className="py-2 text-right">{formatarComSinal(l.vies)}</td>
                <td className="py-2 text-right">
                  {l.modelo === 'linha_base' ? '—' : formatarComSinal(l.mae_vs_linha_base, '%', 0)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
