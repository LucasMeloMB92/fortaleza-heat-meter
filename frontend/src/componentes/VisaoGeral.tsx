// Card "Visão geral": um card só, com abas (D49), para as comparações que juntam TODOS os
// modelos e as DUAS variáveis — independente da variável escolhida nos seletores.
// Cada aba busca os próprios dados só quando é aberta (o caso de estudo é o cálculo mais pesado).
import { useState } from 'react'
import type { Modelo } from '../api'
import { useCasoEstudoTodos, useContexto, useMetricas } from '../consultas'
import { AnosAnteriores } from './AnosAnteriores'
import { Cartao, EstadoConsulta } from './Cartao'
import { CasoEstudoGeral } from './CasoEstudoGeral'
import { RankingGeral } from './RankingGeral'

type Aba = 'ranking' | 'caso' | 'anos'

const ABAS: { id: Aba; rotulo: string; subtitulo: string }[] = [
  {
    id: 'ranking',
    rotulo: 'Ranking',
    subtitulo:
      'Temperatura e sensação térmica juntas, no mesmo teste de 10 dias que os modelos não conheciam. Clique num modelo para selecioná-lo.',
  },
  {
    id: 'caso',
    rotulo: 'Caso de estudo',
    subtitulo:
      'E se o modelo só conhecesse os dias antes da mudança de outubro? Todos os modelos, nas duas variáveis, avaliados no mesmo período de teste.',
  },
  {
    id: 'anos',
    rotulo: 'Anos anteriores',
    subtitulo:
      'O período de agora comparado com o mesmo período do calendário nos anos anteriores: o que é estação do ano e o que é anomalia.',
  },
]

function PainelRanking(props: { modelo: Modelo; aoSelecionar: (m: Modelo) => void }) {
  const temp = useMetricas('temperatura')
  const sens = useMetricas('sensacao')
  return (
    <EstadoConsulta
      carregando={temp.isPending || sens.isPending}
      erro={temp.error ?? sens.error}
      aoTentarDeNovo={() => {
        temp.refetch()
        sens.refetch()
      }}
      alturaEsqueleto="h-64"
      mensagemCarregando="Testando todos os modelos nas duas variáveis…"
      dicaCarregando="Na primeira vez do dia leva cerca de 20 a 60 segundos."
    >
      {temp.data && sens.data && (
        <RankingGeral
          temperatura={temp.data}
          sensacao={sens.data}
          modeloSelecionado={props.modelo}
          aoSelecionar={props.aoSelecionar}
        />
      )}
    </EstadoConsulta>
  )
}

function PainelCaso(props: { modelo: Modelo; aoSelecionar: (m: Modelo) => void }) {
  const temp = useCasoEstudoTodos('temperatura')
  const sens = useCasoEstudoTodos('sensacao')
  return (
    <EstadoConsulta
      carregando={temp.isPending || sens.isPending}
      erro={temp.error ?? sens.error}
      aoTentarDeNovo={() => {
        temp.refetch()
        sens.refetch()
      }}
      alturaEsqueleto="h-64"
      mensagemCarregando="Treinando os 3 cenários de todos os modelos nas duas variáveis…"
      dicaCarregando="É o cálculo mais pesado: na primeira vez do dia pode levar 1 a 2 minutos."
    >
      {temp.data && sens.data && (
        <CasoEstudoGeral
          temperatura={temp.data}
          sensacao={sens.data}
          modeloSelecionado={props.modelo}
          aoSelecionar={props.aoSelecionar}
        />
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
  const [aba, setAba] = useState<Aba>('ranking')
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
        {aba === 'ranking' && <PainelRanking modelo={props.modelo} aoSelecionar={props.aoSelecionar} />}
        {aba === 'caso' && <PainelCaso modelo={props.modelo} aoSelecionar={props.aoSelecionar} />}
        {aba === 'anos' && <PainelAnos />}
      </div>
    </Cartao>
  )
}
