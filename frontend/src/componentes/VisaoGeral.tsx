// Card "Visão geral": um card só, com abas (D49), para as comparações que juntam TODOS os
// modelos — independente do modelo escolhido nos seletores. A aba "Ranking" saiu com a sensação
// térmica (D52): com uma série só, ela repetia a tabela "Comparação dos modelos".
// Cada aba busca os próprios dados só quando é aberta (o caso de estudo é o cálculo mais pesado).
import { useState } from 'react'
import type { Modelo } from '../api'
import { useCasoEstudoTodos, useContexto } from '../consultas'
import { AnosAnteriores } from './AnosAnteriores'
import { Cartao, EstadoConsulta } from './Cartao'
import { CasoEstudoGeral } from './CasoEstudoGeral'

type Aba = 'caso' | 'anos'

const ABAS: { id: Aba; rotulo: string; subtitulo: string }[] = [
  {
    id: 'caso',
    rotulo: 'Caso de estudo',
    subtitulo:
      'E se o modelo só conhecesse os dias antes da mudança de outubro? Todos os modelos, avaliados no mesmo período de teste. Clique num modelo para selecioná-lo.',
  },
  {
    id: 'anos',
    rotulo: 'Anos anteriores',
    subtitulo:
      'O período de agora comparado com o mesmo período do calendário nos anos anteriores: o que é estação do ano e o que é anomalia.',
  },
]

function PainelCaso(props: { modelo: Modelo; aoSelecionar: (m: Modelo) => void }) {
  const caso = useCasoEstudoTodos()
  return (
    <EstadoConsulta
      carregando={caso.isPending}
      erro={caso.error}
      aoTentarDeNovo={() => caso.refetch()}
      alturaEsqueleto="h-64"
      mensagemCarregando="Treinando os 3 cenários de todos os modelos…"
      dicaCarregando="É o cálculo mais pesado: na primeira vez do dia pode levar 1 minuto ou mais."
    >
      {caso.data && (
        <CasoEstudoGeral resposta={caso.data} modeloSelecionado={props.modelo} aoSelecionar={props.aoSelecionar} />
      )}
    </EstadoConsulta>
  )
}

function PainelAnos() {
  const contexto = useContexto()
  return (
    <EstadoConsulta
      carregando={contexto.isPending}
      erro={contexto.error}
      aoTentarDeNovo={() => contexto.refetch()}
      alturaEsqueleto="h-64"
      mensagemCarregando="Comparando com os anos anteriores…"
      dicaCarregando="Cálculo leve, separado da fila dos modelos: costuma levar menos de 1 segundo."
    >
      {contexto.data && <AnosAnteriores resposta={contexto.data} />}
    </EstadoConsulta>
  )
}

export function VisaoGeral(props: { modelo: Modelo; aoSelecionar: (m: Modelo) => void }) {
  const [aba, setAba] = useState<Aba>('caso')
  const atual = ABAS.find((a) => a.id === aba) ?? ABAS[0]

  return (
    <Cartao titulo="Visão geral dos modelos" alturaEsqueleto="h-64" subtitulo={atual.subtitulo}>
      {/* Abas acessíveis: role="tablist"/"tab"/"tabpanel" — leitores de tela anunciam "aba 1 de 2". */}
      <div role="tablist" aria-label="Visão geral" className="mb-4 flex gap-1 border-b border-borda">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            id={`aba-${a.id}`}
            aria-selected={aba === a.id}
            aria-controls={`painel-${a.id}`}
            onClick={() => setAba(a.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              aba === a.id ? 'border-tinta font-semibold' : 'border-transparent text-tinta-2 hover:text-tinta'
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`}>
        {/* Só o painel aberto é montado: o caso de estudo só é calculado quando alguém abre a aba. */}
        {aba === 'caso' && <PainelCaso modelo={props.modelo} aoSelecionar={props.aoSelecionar} />}
        {aba === 'anos' && <PainelAnos />}
      </div>
    </Cartao>
  )
}
