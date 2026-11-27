// Parte de cima do card "Caso de estudo": TODOS os modelos — quanto o erro piorou quando o modelo
// só conhecia os dias antes da mudança (D35, D53). Contas em casoGeral.ts; frase em textos.ts (D46).
// O gráfico do modelo escolhido vem logo abaixo, no mesmo card (CasoEstudo.tsx).
import type { Modelo, RespostaCasoEstudo } from '../api'
import { acertosSoAntes, impactos, LIMITE_PIOROU } from '../casoGeral'
import { formatarData, formatarGraus, formatarNumero } from '../formatacao'
import { AJUDA, textoCasoEstudoGeral } from '../textos'
import { Ajuda } from './Ajuda'
import { Detalhes } from './Detalhes'

export function CasoEstudoGeral(props: {
  resposta: RespostaCasoEstudo
  modeloSelecionado: Modelo
  aoSelecionar: (m: Modelo) => void
}) {
  const dias = props.resposta.teste.dias
  const linhas = impactos(props.resposta)
  const { conclusao, detalhe } = textoCasoEstudoGeral(props.resposta)
  const th = 'whitespace-nowrap py-2 pl-3 text-right font-medium'
  const num = 'whitespace-nowrap py-2 pl-3 text-right'
  return (
    <div>
      <p className="mb-4 rounded-md bg-plano p-3 text-sm leading-relaxed">
        <strong>Em resumo:</strong> {conclusao}
      </p>
      <h3 className="text-sm font-semibold">
        Erro médio no teste, com e sem ver a mudança
        <span className="font-normal text-tinta-2"> · mudança em {formatarData(props.resposta.data_mudanca)}</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="mt-1 w-full text-sm">
          <thead>
            <tr className="border-b border-borda text-left text-xs uppercase text-tinta-2">
              <th className="py-2 font-medium">Modelo</th>
              <th className={th}>Atualizado</th>
              <th className={th}>Desatualizado</th>
              <th className={th}>
                Quanto piorou
                <Ajuda rotulo="quanto piorou" texto={AJUDA.piorou} />
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((i) => {
              const selecionado = i.modelo === props.modeloSelecionado
              return (
                <tr key={i.modelo} className={`border-b border-borda/60 tabular-nums ${selecionado ? 'bg-plano' : ''}`}>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => props.aoSelecionar(i.modelo)}
                      aria-pressed={selecionado}
                      className={`text-left ${selecionado ? 'font-semibold' : 'underline decoration-dotted'}`}
                    >
                      {i.nome}
                    </button>
                  </td>
                  <td className={num}>{formatarGraus(i.tudo.mae)}</td>
                  <td className={num}>{formatarGraus(i.soAntes.mae)}</td>
                  <td className={`${num} font-medium ${i.vezes >= LIMITE_PIOROU ? 'text-red-700' : 'text-emerald-700'}`}>
                    {formatarNumero(i.vezes, 1)}×
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-tinta-3">
        "Atualizado" = o modelo conhecia todos os dias até a véspera do teste; "desatualizado" = só os dias antes
        da mudança. Os dois foram avaliados nos mesmos {dias} dias de teste. Em vermelho: errou pelo menos{' '}
        {formatarNumero(LIMITE_PIOROU, 1)} vez mais sem ver a mudança.
      </p>
      <Detalhes rotulo="Ver o que a faixa de 95% mostrou">
        <p className="text-sm leading-relaxed">{detalhe}</p>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b border-borda text-left text-xs uppercase text-tinta-2">
              <th className="py-1 font-medium">Modelo desatualizado</th>
              <th className={th}>
                Acertou a faixa
                <Ajuda rotulo="faixa do modelo que só conhecia os dias antes" texto={AJUDA.faixaSoAntes} />
              </th>
              <th className={th}>
                Largura da faixa
                <Ajuda rotulo="largura da faixa" texto={AJUDA.larguraFaixa} />
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((i) => (
              <tr key={i.modelo} className="border-b border-borda/60 tabular-nums">
                <td className="py-1">{i.nome}</td>
                <td className={num}>
                  {acertosSoAntes(i, dias)} de {dias} dias
                </td>
                <td className={num}>{formatarGraus(i.soAntes.largura_faixa)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Detalhes>
    </div>
  )
}
