// Controles do topo: variável, modelo e horizonte. As opções vêm de /api/opcoes, então a
// tela não repete a lista de modelos (decisão D38).
import type { Modelo, Opcoes, Variavel } from '../api'
import { COR_VARIAVEL } from '../cores'

export function Seletores(props: {
  opcoes: Opcoes
  variavel: Variavel
  modelo: Modelo
  horizonte: number
  aoMudarVariavel: (v: Variavel) => void
  aoMudarModelo: (m: Modelo) => void
  aoMudarHorizonte: (h: number) => void
}) {
  const { opcoes } = props
  const horizontes = Array.from(
    { length: opcoes.horizonte.maximo - opcoes.horizonte.minimo + 1 },
    (_, i) => opcoes.horizonte.minimo + i,
  )

  return (
    <div className="flex flex-wrap items-end gap-6">
      <fieldset>
        <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-tinta-2">
          Variável
        </legend>
        <div className="flex overflow-hidden rounded-lg border border-borda bg-white">
          {opcoes.variaveis.map((v) => {
            const ativa = v.id === props.variavel
            return (
              <button
                key={v.id}
                type="button"
                aria-pressed={ativa}
                onClick={() => props.aoMudarVariavel(v.id)}
                className="px-4 py-2 text-sm font-medium transition-colors"
                style={ativa ? { background: COR_VARIAVEL[v.id], color: 'white' } : undefined}
              >
                {v.nome}
              </button>
            )
          })}
        </div>
      </fieldset>

      <label className="flex flex-col">
        <span className="mb-1 text-xs font-medium uppercase tracking-wide text-tinta-2">Modelo</span>
        <select
          value={props.modelo}
          onChange={(e) => props.aoMudarModelo(e.target.value as Modelo)}
          className="rounded-lg border border-borda bg-white px-3 py-2 text-sm"
        >
          {opcoes.modelos.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col">
        <span className="mb-1 text-xs font-medium uppercase tracking-wide text-tinta-2">
          Horizonte
        </span>
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
  )
}
