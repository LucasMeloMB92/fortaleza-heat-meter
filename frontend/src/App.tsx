// Tela principal: seletores no topo e quatro seções (previsão, métricas, teste, caso de estudo).
// O estado (variável, modelo, horizonte) fica aqui e desce para os componentes.
import { useState } from 'react'
import type { Modelo, Variavel } from './api'
import { Cartao, EstadoConsulta } from './componentes/Cartao'
import { CasoEstudo } from './componentes/CasoEstudo'
import { GraficoPrevisao } from './componentes/GraficoPrevisao'
import { GraficoTeste } from './componentes/GraficoTeste'
import { Seletores } from './componentes/Seletores'
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
import { formatarData } from './formatacao'

export default function App() {
  const opcoes = useOpcoes()
  const saude = useSaude()
  const [variavel, setVariavel] = useState<Variavel>('temperatura')
  const [modelo, setModelo] = useState<Modelo>('sarima')
  const [horizonte, setHorizonte] = useState(7)
  const [comparar, setComparar] = useState(false)

  const outraVariavel: Variavel = variavel === 'temperatura' ? 'sensacao' : 'temperatura'
  const previsao = usePrevisao(variavel, modelo, horizonte)
  const serieOutra = useSerie(outraVariavel, comparar)
  const metricas = useMetricas(variavel)
  const teste = useTeste(variavel, modelo)
  const caso = useCasoEstudo(variavel, modelo)

  const nomeVariavel = opcoes.data?.variaveis.find((v) => v.id === variavel)?.nome ?? ''
  const nomeOutra = opcoes.data?.variaveis.find((v) => v.id === outraVariavel)?.nome ?? ''
  const nomeModelo = opcoes.data?.modelos.find((m) => m.id === modelo)?.nome ?? ''

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold">Fortaleza Heat Meter</h1>
        <p className="mt-1 text-sm text-tinta-2">
          POC de previsão de séries temporais — temperatura e sensação térmica médias diárias de
          Fortaleza-CE (fonte: Open-Meteo).
          {saude.data && (
            <>
              {' '}
              Dados de {formatarData(saude.data.dados.inicio)} a {formatarData(saude.data.dados.fim)} (
              {saude.data.dados.dias} dias).
            </>
          )}
        </p>
      </header>

      <EstadoConsulta carregando={opcoes.isPending} erro={opcoes.error}>
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
        titulo={`Previsão dos próximos ${horizonte} ${horizonte === 1 ? 'dia' : 'dias'} — ${nomeVariavel}`}
        subtitulo={
          <>
            Modelo {nomeModelo}
            {previsao.data?.configuracao && <> · configuração escolhida: {previsao.data.configuracao}</>}
          </>
        }
      >
        <EstadoConsulta
          carregando={previsao.isPending}
          erro={previsao.error}
          mensagemCarregando="Treinando o modelo… na primeira vez pode levar alguns segundos."
        >
          {previsao.data && (
            <GraficoPrevisao
              resposta={previsao.data}
              outraVariavel={outraVariavel}
              nomeOutra={nomeOutra}
              serieOutra={serieOutra.data}
              comparar={comparar}
              aoMudarComparar={setComparar}
            />
          )}
        </EstadoConsulta>
      </Cartao>

      <Cartao
        titulo="Comparação dos modelos"
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
          mensagemCarregando="Treinando os 4 modelos… na primeira vez leva cerca de 10 segundos."
        >
          {metricas.data && (
            <TabelaMetricas resposta={metricas.data} modeloSelecionado={modelo} aoSelecionar={setModelo} />
          )}
        </EstadoConsulta>
      </Cartao>

      <Cartao
        titulo={`Previsão x real no período de teste — ${nomeModelo}`}
        subtitulo={
          <>
            O modelo previu sem conhecer estes dias. Pontos ● caíram dentro da faixa de 95%; ✕ caíram
            fora.
          </>
        }
      >
        <EstadoConsulta carregando={teste.isPending} erro={teste.error} mensagemCarregando="Calculando…">
          {teste.data && <GraficoTeste resposta={teste.data} />}
        </EstadoConsulta>
      </Cartao>

      <Cartao
        titulo={`Caso de estudo: mudança forte de temperatura — ${nomeModelo}`}
        subtitulo={
          <>
            E se o modelo só conhecesse os dias antes da mudança? Comparamos três formas de treinar,
            todas avaliadas no mesmo período de teste.
          </>
        }
      >
        <EstadoConsulta
          carregando={caso.isPending}
          erro={caso.error}
          mensagemCarregando="Treinando os 3 cenários… na primeira vez pode levar até 30 segundos."
        >
          {caso.data && <CasoEstudo resposta={caso.data} />}
        </EstadoConsulta>
      </Cartao>

      <footer className="pb-4 text-center text-xs text-tinta-3">
        Datas em DD-MM-AAAA · temperaturas em °C · faixa de incerteza de 95%
      </footer>
    </div>
  )
}
