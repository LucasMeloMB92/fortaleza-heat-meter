// Resumo em linguagem simples no topo da previsão: cartões de destaque, um parágrafo com o que
// deve acontecer e outro com "dá para confiar?" (D46). Textos gerados em textos.ts.
import type { LinhaMetricas, RespostaPrevisao } from '../api'
import { AJUDA, resumoPrevisao, textoConfianca } from '../textos'
import { Ajuda } from './Ajuda'

export function ResumoPrevisao(props: {
  resposta: RespostaPrevisao
  metricasDoModelo?: LinhaMetricas
  diasTeste?: number
}) {
  const { cartoes, texto } = resumoPrevisao(props.resposta)

  return (
    <div className="mb-5 space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {cartoes.map((c) => (
          <div key={c.titulo} className="rounded-lg border border-borda bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-tinta-2">{c.titulo}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{c.valor}</p>
            <p className="mt-0.5 text-xs text-tinta-2">{c.detalhe}</p>
          </div>
        ))}
      </div>
      <p className="text-sm leading-relaxed">
        <strong>Resumo:</strong> {texto}
        <Ajuda rotulo="a faixa" texto={AJUDA.faixa} />
      </p>
      {props.metricasDoModelo && props.diasTeste ? (
        <p className="text-sm leading-relaxed text-tinta-2">
          <strong className="text-tinta">Dá para confiar?</strong>{' '}
          {textoConfianca(props.metricasDoModelo, props.diasTeste)}
          <Ajuda rotulo="o teste" texto={AJUDA.teste} />
        </p>
      ) : (
        <p className="animate-pulse text-sm text-tinta-3">Calculando o quanto este modelo acerta…</p>
      )}
    </div>
  )
}
