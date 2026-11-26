# CLAUDE.md — contexto do projeto

Este arquivo existe para dar continuidade entre sessões. Leia antes de qualquer trabalho.

## O projeto

POC (prova de conceito) de **previsão de séries temporais** pedida por um cliente: pegar uma série
pequena (90 dias), treinar modelos, prever os próximos 7 dias e mostrar tudo numa ferramenta web
(histórico + previsão + faixa de incerteza).

Além de construir, o objetivo é **aprender e documentar cada decisão**.

### Dados
- **Variáveis (2 séries):** temperatura média diária (`temperature_2m_mean`) e sensação térmica
  média diária (`apparent_temperature_mean`) de Fortaleza-CE.
- Local: lat -3.72, lon -38.54, fuso `America/Fortaleza`.
- Fonte: API histórica do Open-Meteo com `models=best_match` (gratuita, sem cadastro). Dias
  recentes faltando → reserva com `past_days` da API de previsão (coluna `fonte` indica a origem).
  NÃO usar `era5` puro: é ~0,6 °C mais frio e criaria salto artificial (D21).
- Período: 90 dias terminando ONTEM (D20). CSV: `backend/data/fortaleza_diario.csv`.
- **Atualização automática (D44):** a API recoleta sozinha quando os dados não vão até ontem
  (fuso America/Fortaleza), grava de forma atômica e limpa o cache; falha → mantém dados e avisa
  em `/api/saude`. Testes NUNCA podem tocar nos CSVs reais nem depender do dia (congelar
  `servico.hoje_em_fortaleza`).
- Sensação é prevista sozinha (não é apoio da temperatura); sem umidade/vento (D02, D19).
- Contexto de 3 anos (`backend/data/fortaleza_contexto_3anos.csv`) só para entender, nunca para
  treinar (D24). Achados da etapa 2: não estacionária em torno de nível fixo (mas a sensação é
  estacionária em torno de uma reta — corrigido na etapa 3, D33), PACF só na defasagem 1, sem
  sazonalidade semanal; anomalia de 2026 com mudança em 15/10 (temp.) e 23/10 (sensação) (D26).
- Cores fixas: temperatura `#2a78d6` (azul), sensação `#eb6834` (laranja); um eixo por painel (D25).

### Modelagem
- Horizonte: 7 dias. Validação: últimos 10 dias como teste.
- Modelos: (1) linha de base = média dos últimos 7 dias; (2) ETS/Holt-Winters; (3) SARIMA;
  (4) Prophet (só comparação — feito para séries longas); (5) Chronos-2 (IA moderna, D47).
- Os 5 modelos rodam para as 2 variáveis (10 combinações), com a mesma interface:
  `modelos.prever(nome, serie, horizonte, nivel) -> Previsao(tabela, detalhes)` (D27).
- ETS/SARIMA escolhem configuração pelo menor AICc, refeito a cada treino (D28). SARIMA: d pelo
  ADF com tendência ("ct"), não fixo (D33). Prophet sem sazonalidades (D32).
- Métricas: MAE, RMSE, cobertura do intervalo de 95% (+ auxiliares: MAE dias 1–7, viés, MAE vs
  linha de base — D34; largura média da faixa `largura_faixa` — D48). `avaliacao.comparar_modelos(serie)`.
- Resultado da etapa 4 (teste 16/11–25/11): temperatura — Prophet 0,31 °C (−33% vs base), SARIMA
  0,38; sensação — SARIMA 0,29 (−15%), Prophet 0,38 (+13%, pior). SARIMA = mais consistente.
- Caso de estudo: quebra estrutural — modelo treinado só antes da mudança recente x treinado com tudo
  (+ "só depois"), todos avaliados na mesma janela de teste (D35). `caso_estudo.avaliar_cenarios`.
  Resultado: "só antes" erra 2–6x mais (viés negativo; SARIMA cobertura 0–10%); Prophet sobrevive
  por prolongar a tendência sazonal. Conclusão: retreinar com frequência.
- **Chronos-2 (evolução 11.2, D47):** `amazon/chronos-2` na CPU (torch +cpu), zero-shot, modelo
  carregado 1x por processo; previsão = mediana, faixa = quantis 2,5%/97,5% (interpolados).
  Resultado: temp. 0,31 (empata com Prophet), sens. 0,33 (empata com a base); faixa ~2x mais
  larga que os outros. Caso de estudo "só antes": erra como o SARIMA, mas cobre 10/10 (faixa
  larga). Conclusão: empata, não ganha — SARIMA segue recomendado. Testes usam o modelo real
  (baixado 1x para `~/.cache/huggingface`). **D51:** versão fixa `CHRONOS_VERSAO` (commit do Hub) e
  carga pela pasta local (`_pasta_do_chronos`: cache com `local_files_only=True`, senão baixa) —
  sem internet carrega em ~12 s (antes ~56 s: 5 tentativas de rede).

### Tecnologias
- Backend: Python 3.12 (venv em `backend/.venv`), pandas, statsmodels, prophet, chronos-forecasting
  (+ torch CPU), Flask + Flask-CORS.
- Frontend: React + Vite + TypeScript, Recharts, TanStack Query, Tailwind CSS.
- Qualidade: Git (commit por etapa), pytest + ruff (backend), Vitest + tsc + oxlint (frontend).
- Monorepo: `/backend`, `/frontend`, `/docs`.

## Estado atual e como retomar (atualizado em 26-11-2026)
- **Todas as etapas (0–8) concluídas + evolução 11.2 (Chronos-2) concluída.** Relatório final em
  `docs/relatorio-final.md`: recomendação = **SARIMA** (mais consistente); seção 5.6 e 11.2 = Chronos.
- NÃO propor roteiro de ML/DL próprio (LightGBM, redes treinadas do zero) — decisão do usuário.
  Melhorias ainda registradas no relatório: textos por IA (Gemma/Gemini), outras métricas
  (cliente ainda sem métrica real — exemplo genérico: vendas diárias), publicação online,
  repetir a comparação em várias semanas.
- **Card "Visão geral dos modelos" com abas (D49) ✅** — no topo da tela, todos os modelos e as duas
  variáveis, sem depender dos seletores; só a aba aberta busca dados. Abas: Ranking (D48,
  `ranking.ts`), Caso de estudo (`casoGeral.ts`), Anos anteriores (D50, `/api/contexto`;
  relatório seção 3 "Comparação com os anos anteriores"). Compara com 2 anos anteriores (2024,
  2025): o CSV de contexto começa em 26-11-2023.
- **Última decisão registrada: D51** — a próxima é D52 (`docs/decisoes.md`).
- **Para retomar:** leia o fim de `docs/diario.md` (inclui as dúvidas discutidas). Para ver a tela:
  suba `backend` e `frontend` pelo `.claude/launch.json`. Os números da documentação são um retrato
  de 26-11-2026; a ferramenta atualiza os dados sozinha todo dia (D44).
- **Qualidade atual:** backend 70 testes (pytest) + ruff limpo; frontend 42 testes (Vitest) +
  tsc + oxlint + build limpos.

## Etapas (ordem fixa)
0. Preparação ✅
1. Coleta de dados ✅
2. Exploração ✅
3. Modelagem ✅
4. Validação ✅
5. Caso de estudo ✅
6. API Flask ✅
7. Frontend ✅ (+ ajustes pedidos depois: atualização automática D44, tela robusta D45,
   linguagem simples D46)
8. Relatório final ✅

Evoluções depois da POC: 11.2 Chronos-2 ✅ (D47).

Atualize a marcação ✅ e o `docs/diario.md` ao concluir cada etapa.

## Regras de trabalho (pedidas pelo usuário)
1. Trabalhar como **mentor**: explicar o porquê de cada passo em português simples, **antes** de executar.
2. Executar **uma etapa por vez**. Ao final: parar, mostrar resultado, explicar o que aprendemos e
   **esperar OK** antes de seguir.
3. Toda escolha não definida pelo usuário (bibliotecas, parâmetros, intervalo, endpoints...):
   explicar opções, dizer qual foi escolhida e por quê — e registrar em `docs/decisoes.md`.
4. Código simples e **comentado em português**, pensado para quem está aprendendo.
5. **Commit no Git ao final de cada etapa**, com mensagem clara.
6. **Nunca incluir `Co-Authored-By: Claude` (nem outra atribuição ao Claude) nos commits** — pedido
   do usuário; o histórico foi reescrito em 26-11-2026 para remover essas linhas.

## Documentação (em português) — manter sempre atualizada
- `README.md`: o que é, como instalar e rodar.
- `docs/decisoes.md`: uma entrada por decisão — "Decisão / Opções consideradas / Escolha / Por quê".
- `docs/diario.md`: por etapa — o que foi feito, resultados (números e gráficos), o que aprendi.
- `docs/glossario.md`: termos explicados de forma simples.
- `docs/api.md`: cada endpoint (método, rota, parâmetros, exemplos de requisição/resposta, erros).
  Atualizar sempre que um endpoint mudar.
- `docs/relatorio-final.md`: resumo para o cliente (gráficos, modelo vencedor, erro em °C, limites).
  Deve ter uma seção explicando o que foi decidido e configurado em **cada modelo**, com todos os
  termos técnicos explicados **no próprio arquivo** (sem depender do glossário) — pedido do usuário.
- `docs/relatorio-tecnico.md`: guia passo a passo para reproduzir a POC ou aplicar o método em outra
  série (objetivo → o que fazer → código-chave → como conferir → como adaptar; checklist final).
  Atualizar quando mudar função, comando ou decisão citada.

### API (etapa 6)
- `backend/app.py` (rotas, erros, CORS) + `backend/previsao/servico.py` (respostas + cache).
- 8 rotas GET em `/api`: saude, opcoes, serie, previsao, metricas, teste, caso-estudo, contexto (D50,
  sem parâmetros; cálculo leve com trava própria `_calculo_leve`, fora da fila dos modelos). Parâmetros
  `variavel` (temperatura|sensacao), `modelo`, `horizonte` (1–14). Detalhes em `docs/api.md`.
- Cache em memória, calcula no 1º pedido, em fila única com RLock (D37 + atualização). CORS só
  `http://localhost:5173` (D39).

### Frontend (etapa 7)
- `frontend/`: Vite + React 19 + TS 7, Recharts 3, TanStack Query 5, Tailwind 4, Vitest, oxlint.
- **Datas exibidas SEMPRE em DD-MM-AAAA** via `formatarData` (`src/formatacao.ts`) — pedido do
  usuário (D41). API continua em AAAA-MM-DD. Números com vírgula (`29,10 °C`). Não usar `new Date()`
  para formatar (bug de fuso).
- Linguagem simples (D46): toda frase da tela vem de `src/textos.ts` (regras + testes), só afirma
  o que os números mostram. Temperaturas com 1 casa, erros/variações com 2 (iguais às tabelas).
  Empates no menor erro são citados juntos; para o Chronos, "viu" em vez de "treinado".
  Textos por IA (Gemma/Gemini) = melhoria futura no relatório.
- Nunca tela branca (D45): limites de erro (seção, faixa, página), esqueletos com contador,
  `lazy` + `Suspense` nos gráficos, faixa de aviso no topo (`AvisoTopo`), "Tentar de novo".
- Proxy do Vite `/api` → Flask :5000 (D42). Eixos/cores/formatação centralizados
  (`componentes/eixos.ts`, `cores.ts`, `formatacao.ts`).
- Comandos (em `frontend/`): `npm install`, `npm run dev`, `npm test`, `npm run lint`,
  `npm run build`. Navegador embutido: `.claude/launch.json` (configs `backend` e `frontend`).

## Comandos úteis (a partir de `backend/`)
- API: `.venv\Scripts\python -m flask --app app run --port 5000`
- Scripts de etapa: `.venv\Scripts\python -m scripts.etapaN_nome` (ex.: `scripts.etapa1_coleta`)
- Testes: `.venv\Scripts\python -m pytest`
- Lint: `.venv\Scripts\python -m ruff check .` e `.venv\Scripts\python -m ruff format .`
