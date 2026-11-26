// Peças visuais reaproveitadas: o "cartão" de cada seção e os estados de carregando/erro.
import type { ReactNode } from 'react'

export function Cartao(props: { titulo: string; subtitulo?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-borda bg-superficie p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">{props.titulo}</h2>
        {props.subtitulo && <p className="mt-1 text-sm text-tinta-2">{props.subtitulo}</p>}
      </header>
      {props.children}
    </section>
  )
}

/** Mostra "carregando" ou a mensagem de erro de uma consulta; senão, o conteúdo. */
export function EstadoConsulta(props: {
  carregando: boolean
  erro: Error | null
  mensagemCarregando?: string
  children: ReactNode
}) {
  if (props.erro) {
    return (
      <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
        {props.erro.message}
      </p>
    )
  }
  if (props.carregando) {
    return (
      <p aria-live="polite" className="animate-pulse p-6 text-center text-sm text-tinta-2">
        {props.mensagemCarregando ?? 'Carregando…'}
      </p>
    )
  }
  return <>{props.children}</>
}

