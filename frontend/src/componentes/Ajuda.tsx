// Ícone "i" com uma explicação curta: abre ao passar o mouse, ao focar pelo teclado ou ao
// clicar (no celular); fecha ao sair, com Esc ou ao rolar a página. Usado ao lado de termos
// técnicos (D46).
//
// O aviso usa position: fixed (posição em relação à JANELA), calculada a partir do ícone.
// Motivo: dentro de uma tabela com rolagem horizontal, um aviso "absolute" é cortado pela
// borda da tabela (visto no teste da tela). Fixo, ele nunca é cortado e fica sempre na tela.
import { useEffect, useId, useRef, useState } from 'react'

const LARGURA = 256 // px (w-64)
const MARGEM = 8 // distância mínima da borda da janela

export function Ajuda(props: { texto: string; rotulo: string }) {
  const [posicao, setPosicao] = useState<{ top: number; left: number } | null>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const id = useId()

  const abrir = () => {
    const r = botao.current?.getBoundingClientRect()
    if (!r) return
    const centro = r.left + r.width / 2 - LARGURA / 2
    const left = Math.min(Math.max(centro, MARGEM), window.innerWidth - LARGURA - MARGEM)
    setPosicao({ top: r.bottom + 6, left })
  }
  const fechar = () => setPosicao(null)

  // Ao rolar, a posição calculada deixaria de bater com o ícone: fecha o aviso.
  useEffect(() => {
    if (!posicao) return
    window.addEventListener('scroll', fechar, { capture: true, once: true })
    return () => window.removeEventListener('scroll', fechar, { capture: true })
  }, [posicao])

  return (
    <>
      <button
        ref={botao}
        type="button"
        aria-label={`O que é ${props.rotulo}?`}
        aria-expanded={posicao !== null}
        aria-describedby={posicao ? id : undefined}
        // O clique só ABRE: ao clicar, o foco já abriu; alternar aqui fecharia na mesma hora.
        onClick={abrir}
        onMouseEnter={abrir}
        onMouseLeave={fechar}
        onFocus={abrir}
        onBlur={fechar}
        onKeyDown={(e) => e.key === 'Escape' && fechar()}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-tinta-3 align-middle text-[10px] font-bold normal-case text-tinta-2 hover:bg-plano"
      >
        i
      </button>
      {posicao && (
        <span
          role="tooltip"
          id={id}
          style={{ top: posicao.top, left: posicao.left, width: LARGURA }}
          className="fixed z-50 whitespace-normal rounded-md border border-borda bg-white p-2 text-left text-xs font-normal normal-case leading-snug tracking-normal text-tinta-2 shadow-lg"
        >
          {props.texto}
        </span>
      )}
    </>
  )
}
