// Faixa de aviso no topo (D45): conexão com a API e situação da atualização automática (D44).
import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Saude } from '../api'
import { formatarData } from '../formatacao'

export function AvisoTopo(props: { saude: UseQueryResult<Saude>; aoTentarDeNovo: () => void }) {
  const { saude } = props

  if (saude.isPending) {
    return (
      <Faixa tipo="info">
        <span className="animate-pulse">
          Conectando à API e conferindo se os dados estão em dia… (se houver dia novo, os dados são
          baixados do Open-Meteo)
        </span>
      </Faixa>
    )
  }

  if (saude.isError) {
    return (
      <Faixa tipo="erro" aoTentarDeNovo={props.aoTentarDeNovo}>
        <strong>Sem conexão com a API.</strong> Verifique se o backend está rodando na porta 5000
        (veja o README) e clique em “Tentar de novo”.
      </Faixa>
    )
  }

  // Se um backend antigo (sem "atualizacao") estiver rodando, o LimiteDeErro em volta desta
  // faixa a esconde sem derrubar a página (D45, D56).
  const { atualizacao, dados } = saude.data
  if (!atualizacao.em_dia) {
    return (
      <Faixa tipo="alerta" aoTentarDeNovo={props.aoTentarDeNovo}>
        <strong>Dados desatualizados.</strong> Não foi possível buscar os dias mais recentes no
        Open-Meteo{atualizacao.erro ? ` (${atualizacao.erro})` : ''}. Mostrando dados até{' '}
        {formatarData(dados.fim)}; o esperado era até {formatarData(atualizacao.ultimo_dia_esperado)}.
        Uma nova tentativa é feita automaticamente em alguns minutos.
      </Faixa>
    )
  }
  return null // tudo em dia: nenhum aviso
}

const ESTILOS = {
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  alerta: 'border-amber-300 bg-amber-50 text-amber-900',
  erro: 'border-red-300 bg-red-50 text-red-900',
}

function Faixa(props: {
  tipo: keyof typeof ESTILOS
  aoTentarDeNovo?: () => void
  children: ReactNode
}) {
  return (
    <div
      role={props.tipo === 'info' ? 'status' : 'alert'}
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${ESTILOS[props.tipo]}`}
    >
      <p>{props.children}</p>
      {props.aoTentarDeNovo && (
        <button
          type="button"
          onClick={props.aoTentarDeNovo}
          className="rounded-md border border-current bg-white/60 px-3 py-1 font-medium hover:bg-white"
        >
          Tentar de novo
        </button>
      )}
    </div>
  )
}
