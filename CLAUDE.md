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
- Sensação é prevista sozinha (não é apoio da temperatura); sem umidade/vento (D02, D19).
- Contexto de 3 anos (`backend/data/fortaleza_contexto_3anos.csv`) só para entender, nunca para
  treinar (D24). Achados da etapa 2: não estacionária em torno de nível fixo (mas a sensação é
  estacionária em torno de uma reta — corrigido na etapa 3, D33), PACF só na defasagem 1, sem
  sazonalidade semanal; anomalia de 2026 com mudança em 15/10 (temp.) e 23/10 (sensação) (D26).
- Cores fixas: temperatura `#2a78d6` (azul), sensação `#eb6834` (laranja); um eixo por painel (D25).

### Modelagem
- Horizonte: 7 dias. Validação: últimos 10 dias como teste.
- Modelos: (1) linha de base = média dos últimos 7 dias; (2) ETS/Holt-Winters; (3) SARIMA;
  (4) Prophet (só comparação — feito para séries longas).
- Os 4 modelos rodam para as 2 variáveis (8 combinações), com a mesma interface:
  `modelos.prever(nome, serie, horizonte, nivel) -> Previsao(tabela, detalhes)` (D27).
- ETS/SARIMA escolhem configuração pelo menor AICc, refeito a cada treino (D28). SARIMA: d pelo
  ADF com tendência ("ct"), não fixo (D33). Prophet sem sazonalidades (D32).
- Métricas: MAE, RMSE, cobertura do intervalo de 95% (+ auxiliares: MAE dias 1–7, viés, MAE vs
  linha de base — D34). `avaliacao.comparar_modelos(serie)`.
- Resultado da etapa 4 (teste 16/11–25/11): temperatura — Prophet 0,31 °C (−33% vs base), SARIMA
  0,38; sensação — SARIMA 0,29 (−15%), Prophet 0,38 (+13%, pior). SARIMA = mais consistente.
- Caso de estudo: quebra estrutural — modelo treinado só antes da mudança recente x treinado com tudo
  (+ "só depois"), todos avaliados na mesma janela de teste (D35). `caso_estudo.avaliar_cenarios`.
  Resultado: "só antes" erra 2–6x mais (viés negativo; SARIMA cobertura 0–10%); Prophet sobrevive
  por prolongar a tendência sazonal. Conclusão: retreinar com frequência.

### Tecnologias
- Backend: Python 3.12 (venv em `backend/.venv`), pandas, statsmodels, prophet, Flask + Flask-CORS.
- Frontend: React + Vite + TypeScript, Recharts, TanStack Query, Tailwind CSS.
- Qualidade: Git (commit por etapa), pytest, ruff.
- Monorepo: `/backend`, `/frontend`, `/docs`.

## Etapas (ordem fixa)
0. Preparação ✅
1. Coleta de dados ✅
2. Exploração ✅
3. Modelagem ✅
4. Validação ✅
5. Caso de estudo ✅
6. API Flask ✅
7. Frontend ✅
8. Relatório final

Atualize a marcação ✅ e o `docs/diario.md` ao concluir cada etapa.

## Regras de trabalho (pedidas pelo usuário)
1. Trabalhar como **mentor**: explicar o porquê de cada passo em português simples, **antes** de executar.
2. Executar **uma etapa por vez**. Ao final: parar, mostrar resultado, explicar o que aprendemos e
   **esperar OK** antes de seguir.
3. Toda escolha não definida pelo usuário (bibliotecas, parâmetros, intervalo, endpoints...):
   explicar opções, dizer qual foi escolhida e por quê — e registrar em `docs/decisoes.md`.
4. Código simples e **comentado em português**, pensado para quem está aprendendo.
5. **Commit no Git ao final de cada etapa**, com mensagem clara.

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

### API (etapa 6)
- `backend/app.py` (rotas, erros, CORS) + `backend/previsao/servico.py` (respostas + cache).
- 7 rotas GET em `/api`: saude, opcoes, serie, previsao, metricas, teste, caso-estudo. Parâmetros
  `variavel` (temperatura|sensacao), `modelo`, `horizonte` (1–14). Detalhes em `docs/api.md`.
- Cache em memória, calcula no 1º pedido, em fila única com RLock (D37 + atualização). CORS só
  `http://localhost:5173` (D39).

### Frontend (etapa 7)
- `frontend/`: Vite + React 19 + TS 7, Recharts 3, TanStack Query 5, Tailwind 4, Vitest, oxlint.
- **Datas exibidas SEMPRE em DD-MM-AAAA** via `formatarData` (`src/formatacao.ts`) — pedido do
  usuário (D41). API continua em AAAA-MM-DD. Números com vírgula (`29,10 °C`). Não usar `new Date()`
  para formatar (bug de fuso).
- Proxy do Vite `/api` → Flask :5000 (D42). Eixos/cores/formatação centralizados
  (`componentes/eixos.ts`, `cores.ts`, `formatacao.ts`).
- Comandos (em `frontend/`): `npm install`, `npm run dev`, `npm test`, `npm run lint`,
  `npm run build`. Navegador embutido: `.claude/launch.json` (configs `backend` e `frontend`).

## Comandos úteis (a partir de `backend/`)
- API: `.venv\Scripts\python -m flask --app app run --port 5000`
- Scripts de etapa: `.venv\Scripts\python -m scripts.etapaN_nome` (ex.: `scripts.etapa1_coleta`)
- Testes: `.venv\Scripts\python -m pytest`
- Lint: `.venv\Scripts\python -m ruff check .` e `.venv\Scripts\python -m ruff format .`
