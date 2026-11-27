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

  return (
    // items-start: os rótulos e os controles ficam na mesma linha no topo; a descrição do
    // modelo cresce para baixo sem empurrar os vizinhos (com items-end, ficavam desalinhados).
    <div className="flex flex-wrap items-start gap-6">
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
        {/* O que o modelo escolhido faz, em uma frase (D46). */}
        <span className="mt-1 max-w-xs text-xs leading-snug text-tinta-2">
          {DESCRICAO_MODELO[props.modelo]}
        </span>
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
