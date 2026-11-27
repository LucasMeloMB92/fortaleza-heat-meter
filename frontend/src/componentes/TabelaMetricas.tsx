// Tabela comparando os 5 modelos no período de teste, em linguagem simples (D46): resumo em
// texto, colunas com nomes do dia a dia e detalhes técnicos recolhidos. Clicar seleciona o modelo.
import { useState } from 'react'
import type { Modelo, RespostaMetricas } from '../api'
import { formatarComSinal, formatarGraus } from '../formatacao'
import { AJUDA, rotuloVsRegraSimples, textoComparacao } from '../textos'
import { Ajuda } from './Ajuda'

export function TabelaMetricas(props: {
  resposta: RespostaMetricas
  modeloSelecionado: Modelo
  aoSelecionar: (m: Modelo) => void
}) {
  const [detalhes, setDetalhes] = useState(false)
  const linhas = props.resposta.metricas
  const diasTeste = props.resposta.teste.dias
  const menorMae = Math.min(...linhas.map((l) => l.mae ?? Infinity))
  const th = 'py-2 font-medium'
  const num = 'whitespace-nowrap py-2 pl-4 text-right' // números: espaço entre colunas, sem quebrar

  return (
    <div>
      <p className="mb-3 text-sm leading-relaxed">{textoComparacao(props.resposta)}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-borda text-left text-xs uppercase text-tinta-2">
              <th className={th}>Modelo</th>
              <th className={`${th} whitespace-nowrap pl-4 text-right`}>
                Erro médio
                <Ajuda rotulo="erro médio" texto={AJUDA.erroMedio} />
              </th>
              <th className={`${th} whitespace-nowrap pl-4 text-right`}>
                Acertou a faixa
                <Ajuda rotulo="acertou a faixa" texto={AJUDA.acertouFaixa} />
              </th>
              <th className={`${th} whitespace-nowrap pl-4 text-right`}>
                vs regra simples
                <Ajuda rotulo="comparação com a regra simples" texto={AJUDA.regraSimples} />
              </th>
              {detalhes && (
                <>
                  <th className={`${th} whitespace-nowrap pl-4 text-right`}>
                    RMSE
                    <Ajuda rotulo="RMSE" texto={AJUDA.rmse} />
                  </th>
                  <th className={`${th} whitespace-nowrap pl-4 text-right`}>
                    Viés
                    <Ajuda rotulo="viés" texto={AJUDA.vies} />
                  </th>
                  <th className={`${th} whitespace-nowrap pl-4 text-right`}>
                    Largura da faixa
                    <Ajuda rotulo="largura da faixa" texto={AJUDA.larguraFaixa} />
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const selecionado = l.modelo === props.modeloSelecionado
              const melhor = l.mae === menorMae
              const acertos = Math.round(((l.cobertura ?? 0) / 100) * diasTeste)
              const pct = l.mae_vs_linha_base ?? 0
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
                      {detalhes && <span className="block text-xs text-tinta-3">{l.configuracao}</span>}
                    </button>
                  </td>
                  <td className={`${num} ${melhor ? 'font-semibold' : ''}`}>{formatarGraus(l.mae)}</td>
                  <td className={num}>
                    {acertos} de {diasTeste} dias
                  </td>
                  <td className={`${num} ${pct <= -3 ? 'text-emerald-700' : pct >= 3 ? 'text-red-700' : ''}`}>
                    {rotuloVsRegraSimples(l)}
                  </td>
                  {detalhes && (
                    <>
                      <td className={num}>{formatarGraus(l.rmse)}</td>
                      <td className={num}>{formatarComSinal(l.vies)}</td>
                      <td className={num}>{formatarGraus(l.largura_faixa)}</td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => setDetalhes((d) => !d)}
        aria-expanded={detalhes}
        className="mt-3 text-xs text-tinta-2 underline decoration-dotted hover:text-tinta"
      >
        {detalhes ? 'Esconder detalhes técnicos' : 'Mostrar detalhes técnicos (RMSE, viés, largura da faixa, configuração)'}
      </button>
    </div>
  )
}
