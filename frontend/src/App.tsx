// Tela principal: aviso no topo, visão geral com abas (todos os modelos, as duas variáveis —
// D48, D49), seletores e quatro seções por variável (previsão, métricas, teste, caso de estudo). O estado (variável, modelo, horizonte) fica aqui e desce para os componentes.
import { useQueryClient } from '@tanstack/react-query'
import { lazy, useEffect, useRef, useState } from 'react'
import type { Modelo, Variavel } from './api'
import { AvisoTopo } from './componentes/AvisoTopo'
import { Cartao, EstadoConsulta } from './componentes/Cartao'
import { LimiteDeErro } from './componentes/LimiteDeErro'
import { Seletores } from './componentes/Seletores'
import { VisaoGeral } from './componentes/VisaoGeral'
import { TabelaMetricas } from './componentes/TabelaMetricas'
import {
  useCasoEstudo,
  useMetricas,
  useOpcoes,
  usePrevisao,
  useSaude,
  useSerie,
  useTeste,
} from './consultas'
import { ResumoPrevisao } from './componentes/ResumoPrevisao'
import { formatarData } from './formatacao'
import { textoTeste } from './textos'

// Carregamento sob demanda (D45): o código dos gráficos (Recharts, a parte mais pesada) é
// baixado separado; enquanto chega, o <Suspense> de cada cartão mostra o esqueleto.
const GraficoPrevisao = lazy(() =>
  import('./componentes/GraficoPrevisao').then((m) => ({ default: m.GraficoPrevisao })),
)
const GraficoTeste = lazy(() =>
  import('./componentes/GraficoTeste').then((m) => ({ default: m.GraficoTeste })),
)
const CasoEstudo = lazy(() =>
  import('./componentes/CasoEstudo').then((m) => ({ default: m.CasoEstudo })),
)

/** " — Nome" quando o nome já chegou da API; vazio enquanto não chegou (sem traço solto). */
const comTraco = (nome: string) => (nome ? ` — ${nome}` : '')

/** Quando o servidor atualiza os dados (dia novo — D44), recarrega todas as seções. */
function useRecarregarQuandoODiaVirar(ultimoDia: string | undefined) {
  const clienteConsultas = useQueryClient()
  const anterior = useRef(ultimoDia)
  useEffect(() => {
    if (ultimoDia && anterior.current && ultimoDia !== anterior.current) {
      clienteConsultas.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'saude' })
    }
    anterior.current = ultimoDia
  }, [ultimoDia, clienteConsultas])
}

export default function App() {
  const clienteConsultas = useQueryClient()
  const opcoes = useOpcoes()
  const saude = useSaude()
  const [variavel, setVariavel] = useState<Variavel>('temperatura')
  const [modelo, setModelo] = useState<Modelo>('sarima')
  const [horizonte, setHorizonte] = useState(7)
  const [comparar, setComparar] = useState(false)

  useRecarregarQuandoODiaVirar(saude.data?.dados.fim)

  const outraVariavel: Variavel = variavel === 'temperatura' ? 'sensacao' : 'temperatura'
  const previsao = usePrevisao(variavel, modelo, horizonte)
  const serieOutra = useSerie(outraVariavel, comparar)
  const metricas = useMetricas(variavel)
  const teste = useTeste(variavel, modelo)
  const caso = useCasoEstudo(variavel, modelo)

  const nomeVariavel = opcoes.data?.variaveis.find((v) => v.id === variavel)?.nome ?? ''
  const nomeOutra = opcoes.data?.variaveis.find((v) => v.id === outraVariavel)?.nome ?? ''
  const nomeModelo = opcoes.data?.modelos.find((m) => m.id === modelo)?.nome ?? ''

  // "Tentar de novo" geral: refaz todas as consultas que falharam.
  const tentarTudoDeNovo = () => clienteConsultas.refetchQueries({ type: 'active' })

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold">Fortaleza Heat Meter</h1>
        <p className="mt-1 text-sm text-tinta-2">
          Previsão de séries temporais — temperatura e sensação térmica médias diárias de
          Fortaleza-CE (fonte: Open-Meteo).
          {saude.data && (
            <>
              {' '}
              Dados de {formatarData(saude.data.dados.inicio)} a {formatarData(saude.data.dados.fim)} (
              {saude.data.dados.dias} dias), atualizados automaticamente todo dia.
            </>
          )}
        </p>
      </header>

      {/* Limite de erro próprio: se a faixa de aviso quebrar, só ela some — não a página. */}
      <LimiteDeErro titulo="O aviso de situação dos dados não pôde ser exibido.">
        <AvisoTopo saude={saude} aoTentarDeNovo={tentarTudoDeNovo} />
      </LimiteDeErro>

      <VisaoGeral modelo={modelo} aoSelecionar={setModelo} />

      <EstadoConsulta
        carregando={opcoes.isPending}
        erro={opcoes.error}
        aoTentarDeNovo={() => opcoes.refetch()}
        mensagemCarregando="Carregando opções…"
        alturaEsqueleto="h-20"
      >
        {opcoes.data && (
          <div className="rounded-xl border border-borda bg-superficie p-4 shadow-sm">
            <Seletores
              opcoes={opcoes.data}
              variavel={variavel}
              modelo={modelo}
              horizonte={horizonte}
              aoMudarVariavel={setVariavel}
              aoMudarModelo={setModelo}
              aoMudarHorizonte={setHorizonte}
            />
          </div>
        )}
      </EstadoConsulta>

      <Cartao
        titulo={`Previsão dos próximos ${horizonte} ${horizonte === 1 ? 'dia' : 'dias'}${comTraco(nomeVariavel)}`}
        atualizando={previsao.isFetching && !previsao.isPending}
        subtitulo={
          <>
            {nomeModelo && <>Modelo {nomeModelo}</>}
            {previsao.data?.configuracao && <> · configuração escolhida: {previsao.data.configuracao}</>}
          </>
        }
      >
        <EstadoConsulta
          carregando={previsao.isPending}
          erro={previsao.error}
          aoTentarDeNovo={() => previsao.refetch()}
          mensagemCarregando={`Calculando a previsão do modelo ${nomeModelo}…`}
          dicaCarregando="Na primeira vez do dia pode levar alguns segundos; depois fica instantâneo."
        >
          {previsao.data && (
            <>
              <ResumoPrevisao
                resposta={previsao.data}
                nomeVariavel={nomeVariavel}
                metricasDoModelo={metricas.data?.metricas.find((m) => m.modelo === modelo)}
                diasTeste={metricas.data?.teste.dias}
              />
              <GraficoPrevisao
                resposta={previsao.data}
                outraVariavel={outraVariavel}
                nomeOutra={nomeOutra}
                serieOutra={serieOutra.data}
                comparar={comparar}
                aoMudarComparar={setComparar}
              />
            </>
          )}
        </EstadoConsulta>
      </Cartao>

      <Cartao
        titulo="Comparação dos modelos"
        atualizando={metricas.isFetching && !metricas.isPending}
        alturaEsqueleto="h-56"
        subtitulo={
          <>
            Cada modelo treinou nos primeiros 80 dias e previu os 10 últimos
            {metricas.data && (
              <>
                {' '}
                ({formatarData(metricas.data.teste.inicio)} a {formatarData(metricas.data.teste.fim)})
              </>
            )}
            , que ele não tinha visto. Clique num modelo para selecioná-lo.
          </>
        }
      >
        <EstadoConsulta
          carregando={metricas.isPending}
          erro={metricas.error}
          aoTentarDeNovo={() => metricas.refetch()}
          alturaEsqueleto="h-56"
          mensagemCarregando="Testando todos os modelos…"
          dicaCarregando="Na primeira vez do dia leva cerca de 10 a 30 segundos."
        >
          {metricas.data && (
            <TabelaMetricas resposta={metricas.data} modeloSelecionado={modelo} aoSelecionar={setModelo} />
          )}
        </EstadoConsulta>
      </Cartao>

      <Cartao
        titulo={`Previsão x real no período de teste${comTraco(nomeModelo)}`}
        atualizando={teste.isFetching && !teste.isPending}
        alturaEsqueleto="h-72"
        subtitulo="O modelo previu sem conhecer estes dias. Pontos ● caíram dentro da faixa de 95%; ✕ caíram fora."
      >
        <EstadoConsulta
          carregando={teste.isPending}
          erro={teste.error}
          aoTentarDeNovo={() => teste.refetch()}
          alturaEsqueleto="h-72"
          mensagemCarregando="Comparando previsão e valores reais…"
          dicaCarregando="Usa o mesmo cálculo da comparação dos modelos."
        >
          {teste.data && (
            <>
              <p className="mb-3 text-sm leading-relaxed">{textoTeste(teste.data)}</p>
              <GraficoTeste resposta={teste.data} />
            </>
          )}
        </EstadoConsulta>
      </Cartao>

      <Cartao
        titulo={`Caso de estudo: mudança forte de temperatura${comTraco(nomeModelo)}`}
        atualizando={caso.isFetching && !caso.isPending}
        subtitulo="E se o modelo só conhecesse os dias antes da mudança? Comparamos três formas de treinar, todas avaliadas no mesmo período de teste."
      >
        <EstadoConsulta
          carregando={caso.isPending}
          erro={caso.error}
          aoTentarDeNovo={() => caso.refetch()}
          mensagemCarregando="Treinando os 3 cenários (só antes, tudo, só depois)…"
          dicaCarregando="É o cálculo mais pesado: na primeira vez do dia pode levar 1 minuto ou mais."
        >
          {caso.data && <CasoEstudo resposta={caso.data} nomeVariavel={nomeVariavel} />}
        </EstadoConsulta>
      </Cartao>

      <footer className="pb-4 text-center text-xs text-tinta-3">
        Datas em DD-MM-AAAA · temperaturas em °C · faixa de incerteza de 95%
      </footer>
    </div>
  )
}
