// Bloco recolhido: um botão "Ver ..." que mostra/esconde números de apoio. Os cards mostram
// primeiro a conclusão em linguagem simples; quem quiser os números completos abre aqui.
import { useState, type ReactNode } from 'react'

export function Detalhes(props: { rotulo: string; children: ReactNode }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="text-xs text-tinta-2 underline decoration-dotted hover:text-tinta"
      >
        {aberto ? 'Esconder detalhes' : props.rotulo}
      </button>
      {aberto && <div className="mt-2">{props.children}</div>}
    </div>
  )
}
