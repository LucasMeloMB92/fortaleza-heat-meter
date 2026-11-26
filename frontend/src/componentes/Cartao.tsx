// Peças visuais reaproveitadas: o "cartão" de cada seção e os estados de carregando/erro.
// Cada cartão é protegido por um limite de erro e por um Suspense (D45): se a seção quebrar ou
// ainda estiver baixando o código do gráfico, só ela mostra o aviso — nunca a tela inteira.
import { Suspense, type ReactNode } from 'react'
import { Esqueleto } from './Esqueleto'
import { LimiteDeErro } from './LimiteDeErro'

export function Cartao(props: {
  titulo: string
  subtitulo?: ReactNode
  atualizando?: boolean
  alturaEsqueleto?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-borda bg-superficie p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">
          {props.titulo}
          {props.atualizando && (
            <span aria-live="polite" className="ml-2 animate-pulse text-xs font-normal text-tinta-3">
              atualizando…
            </span>
          )}
        </h2>
        {props.subtitulo && <p className="mt-1 text-sm text-tinta-2">{props.subtitulo}</p>}
      </header>
      <LimiteDeErro>
        <Suspense fallback={<Esqueleto altura={props.alturaEsqueleto} mensagem="Preparando o gráfico…" />}>
          {props.children}
        </Suspense>
      </LimiteDeErro>
    </section>
  )
}

/** Mostra o esqueleto enquanto carrega, o erro (com "Tentar de novo") ou o conteúdo. */
export function EstadoConsulta(props: {
  carregando: boolean
  erro: Error | null
  aoTentarDeNovo?: () => void
  mensagemCarregando?: string
  dicaCarregando?: string
  alturaEsqueleto?: string
  children: ReactNode
}) {
  if (props.erro) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <p>{props.erro.message}</p>
        {props.aoTentarDeNovo && (
          <button
            type="button"
            onClick={props.aoTentarDeNovo}
            className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1 hover:bg-red-100"
          >
            Tentar de novo
          </button>
        )}
      </div>
    )
  }
  if (props.carregando) {
    return (
      <Esqueleto
        altura={props.alturaEsqueleto}
        mensagem={props.mensagemCarregando}
        dica={props.dicaCarregando}
      />
    )
  }
  return <>{props.children}</>
}
