// Parte de cima do card "Caso de estudo": TODOS os modelos — quanto o erro piorou quando o modelo
// só conhecia os dias antes da mudança (D35, D53). Contas em casoGeral.ts; frase em textos.ts (D46).
// O gráfico do modelo escolhido vem logo abaixo, no mesmo card (CasoEstudo.tsx).
import type { Modelo, RespostaCasoEstudo } from '../api'
import { acertosSoAntes, impactos, LIMITE_PIOROU } from '../casoGeral'
import { formatarData, formatarGraus, formatarNumero } from '../formatacao'
import { AJUDA, textoCasoEstudoGeral } from '../textos'
import { Ajuda } from './Ajuda'

export function CasoEstudoGeral(props: {
  resposta: RespostaCasoEstudo
  modeloSelecionado: Modelo
  aoSelecionar: (m: Modelo) => void
}) {
  const dias = props.resposta.teste.dias
  const th = 'whitespace-nowrap py-2 pl-3 text-right font-medium'
  const num = 'whitespace-nowrap py-2 pl-3 text-right'
  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed">{textoCasoEstudoGeral(props.resposta)}</p>
      <h3 className="text-sm font-semibold">
        Temperatura média
        <span className="font-normal text-tinta-2"> · mudança em {formatarData(props.resposta.data_mudanca)}</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="mt-1 w-full text-sm">
          <thead>
            <tr className="border-b border-borda text-left text-xs uppercase text-tinta-2">
              <th className="py-2 font-medium">Modelo</th>
              <th className={th}>Só antes</th>
              <th className={th}>Com tudo</th>
              <th className={th}>
                Piorou
                <Ajuda rotulo="quanto piorou" texto={AJUDA.piorou} />
              </th>
              <th className={th}>
                Faixa (só antes)
                <Ajuda rotulo="faixa do modelo que só conhecia os dias antes" texto={AJUDA.faixaSoAntes} />
              </th>
            </tr>
          </thead>
          <tbody>
            {impactos(props.resposta).map((i) => {
              const selecionado = i.modelo === props.modeloSelecionado
              const acertos = acertosSoAntes(i, dias)
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
                  <td className={num}>{formatarGraus(i.soAntes.mae)}</td>
                  <td className={num}>{formatarGraus(i.tudo.mae)}</td>
                  <td className={`${num} font-medium ${i.vezes >= LIMITE_PIOROU ? 'text-red-700' : 'text-emerald-700'}`}>
                    {formatarNumero(i.vezes, 1)}×
                  </td>
                  <td className={num}>
                    {acertos} de {dias} dias
                    <span className="block text-xs text-tinta-3">largura {formatarGraus(i.soAntes.largura_faixa)}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-tinta-3">
        "Só antes" = o modelo só conhecia os dias anteriores à mudança; "com tudo" = conhecia todos os dias até a véspera
        do teste. Os dois foram avaliados nos mesmos {dias} dias de teste. Em vermelho: o erro ficou pelo menos{' '}
        {formatarNumero(LIMITE_PIOROU, 1)} vez maior.
      </p>
    </div>
  )
}
