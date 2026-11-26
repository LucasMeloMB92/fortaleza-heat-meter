// Card "Ranking geral": os 5 modelos com as DUAS variáveis juntas, independente da variável
// escolhida nos seletores. Contas em ranking.ts; frases em textos.ts (D46). Clicar num modelo
// seleciona-o nas seções de baixo, como na tabela de comparação.
import type { Modelo, RespostaMetricas } from '../api'
import { formatarGraus, formatarNumero } from '../formatacao'
import { type DesempenhoVariavel, montarRanking } from '../ranking'
import { AJUDA, rotuloVsRegraSimples, textoRanking } from '../textos'
import { Ajuda } from './Ajuda'

/** Cor do "vs regra simples": verde = melhor, vermelho = pior (mesmo limite de 3% da tabela). */
const corVsRegra = (d: DesempenhoVariavel) =>
  d.vsRegra === 'melhor' ? 'text-emerald-700' : d.vsRegra === 'pior' ? 'text-red-700' : 'text-tinta-2'

/** Célula de uma variável: "3º · 0,38 °C" e, embaixo, "18% melhor". */
function CelulaVariavel({ d }: { d: DesempenhoVariavel }) {
  return (
    <>
      <span className="font-medium">{d.posicao}º</span>
      <span className="text-tinta-2"> · {formatarGraus(d.linha.mae)}</span>
      <span className={`block text-xs ${corVsRegra(d)}`}>{rotuloVsRegraSimples(d.linha)}</span>
    </>
  )
}

export function RankingGeral(props: {
  temperatura: RespostaMetricas
  sensacao: RespostaMetricas
  modeloSelecionado: Modelo
  aoSelecionar: (m: Modelo) => void
}) {
  const linhas = montarRanking(props.temperatura, props.sensacao)
  const th = 'whitespace-nowrap py-2 pl-3 text-right font-medium'
  const num = 'whitespace-nowrap py-2 pl-3 text-right align-top'

  return (
    <div>
      <p className="mb-3 text-sm leading-relaxed">{textoRanking(linhas)}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-borda text-left text-xs uppercase text-tinta-2">
              <th className="py-2 font-medium">Geral</th>
              <th className="py-2 pl-2 font-medium">Modelo</th>
              <th className={th}>
                Temperatura
                <Ajuda rotulo="posição na temperatura" texto={AJUDA.erroMedio} />
              </th>
              <th className={th}>Sensação</th>
              <th className={th}>
                Posição média
                <Ajuda rotulo="posição média" texto={AJUDA.posicaoMedia} />
              </th>
              <th className={th}>
                Erro médio
                <Ajuda rotulo="erro médio das duas variáveis" texto={AJUDA.erroMedioGeral} />
              </th>
              <th className={th}>
                Largura da faixa
                <Ajuda rotulo="largura da faixa" texto={AJUDA.larguraFaixa} />
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const selecionado = l.modelo === props.modeloSelecionado
              const lider = l.posicaoGeral === 1
              return (
                <tr
                  key={l.modelo}
                  className={`border-b border-borda/60 tabular-nums ${selecionado ? 'bg-plano' : ''}`}
                >
                  <td className={`py-2 align-top ${lider ? 'font-semibold' : ''}`}>{l.posicaoGeral}º</td>
                  <td className="py-2 pl-2 align-top">
                    <button
                      type="button"
                      onClick={() => props.aoSelecionar(l.modelo)}
                      aria-pressed={selecionado}
                      className="text-left"
                    >
                      <span className={selecionado ? 'font-semibold' : 'underline decoration-dotted'}>
                        {l.nome}
                      </span>
                      {lider && (
                        <span className="mt-1 block w-fit whitespace-nowrap rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800">
                          mais regular
                        </span>
                      )}
                    </button>
                  </td>
                  <td className={num}>
                    <CelulaVariavel d={l.temperatura} />
                  </td>
                  <td className={num}>
                    <CelulaVariavel d={l.sensacao} />
                  </td>
                  <td className={`${num} ${lider ? 'font-semibold' : ''}`}>{formatarNumero(l.posicaoMedia, 1)}</td>
                  <td className={num}>{formatarGraus(l.erroMedio)}</td>
                  <td className={num}>
                    {formatarNumero(l.temperatura.linha.largura_faixa)} /{' '}
                    {formatarGraus(l.sensacao.linha.largura_faixa)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-tinta-3">
        Critério: menor posição média nas duas variáveis; empate → menor erro médio. Em cada variável,
        a posição vem do erro médio nos 10 dias de teste (1º = menor erro).
      </p>
    </div>
  )
}
