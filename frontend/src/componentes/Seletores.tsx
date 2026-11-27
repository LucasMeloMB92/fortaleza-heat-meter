// Controles do topo: modelo e horizonte. As opções vêm de /api/opcoes, então a
// tela não repete a lista de modelos (decisão D38).
import type { Modelo, Opcoes } from '../api'
import { DESCRICAO_MODELO } from '../textos'

export function Seletores(props: {
  opcoes: Opcoes
  modelo: Modelo
  horizonte: number
  aoMudarModelo: (m: Modelo) => void
  aoMudarHorizonte: (h: number) => void
}) {
  const { opcoes } = props
  const horizontes = Array.from(
    { length: opcoes.horizonte.maximo - opcoes.horizonte.minimo + 1 },
    (_, i) => opcoes.horizonte.minimo + i,
  )

  const rotulo = 'mb-1 text-xs font-medium uppercase tracking-wide text-tinta-2'
  return (
    // Duas colunas: à esquerda os controles (modelo e horizonte lado a lado); à direita, o que o
    // modelo escolhido faz, ocupando o espaço que sobrava. Em tela estreita, a descrição desce.
    <div className="grid items-start gap-4 md:grid-cols-[auto_1fr] md:gap-6">
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col">
          <span className={rotulo}>Modelo</span>
          <select
            value={props.modelo}
            onChange={(e) => props.aoMudarModelo(e.target.value as Modelo)}
            className="min-w-56 rounded-lg border border-borda bg-white px-3 py-2 text-sm"
          >
            {opcoes.modelos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col">
          <span className={rotulo}>Horizonte</span>
          <select
            value={props.horizonte}
            onChange={(e) => props.aoMudarHorizonte(Number(e.target.value))}
            className="rounded-lg border border-borda bg-white px-3 py-2 text-sm"
          >
            {horizontes.map((h) => (
              <option key={h} value={h}>
                {h} {h === 1 ? 'dia' : 'dias'}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* O que o modelo escolhido faz, em uma frase (D46). aria-live: o leitor de tela lê a
          frase nova quando o modelo muda. */}
      <div className="flex flex-col">
        <span className={rotulo}>Sobre o modelo</span>
        <p aria-live="polite" className="rounded-lg bg-plano px-3 py-2 text-sm leading-snug text-tinta-2">
          {DESCRICAO_MODELO[props.modelo]}
        </p>
      </div>
    </div>
  )
}
