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
- Fonte: API histórica do Open-Meteo (gratuita, sem cadastro). Dias recentes faltando por atraso
  da base → completar com `past_days` da API de previsão (coluna `fonte` indica a origem).
- Período: últimos 90 dias até hoje. Armazenamento: CSV em `backend/data/`.

### Modelagem
- Horizonte: 7 dias. Validação: últimos 10 dias como teste.
- Modelos: (1) linha de base = média dos últimos 7 dias; (2) ETS/Holt-Winters; (3) SARIMA;
  (4) Prophet (só comparação — feito para séries longas).
- Os 4 modelos rodam para as 2 variáveis (8 combinações), com a mesma interface.
- Métricas: MAE, RMSE, cobertura do intervalo de 95%.
- Caso de estudo: quebra estrutural — modelo treinado só antes da mudança recente x treinado com tudo.

### Tecnologias
- Backend: Python 3.12 (venv em `backend/.venv`), pandas, statsmodels, prophet, Flask + Flask-CORS.
- Frontend: React + Vite + TypeScript, Recharts, TanStack Query, Tailwind CSS.
- Qualidade: Git (commit por etapa), pytest, ruff.
- Monorepo: `/backend`, `/frontend`, `/docs`.

## Etapas (ordem fixa)
0. Preparação ✅
1. Coleta de dados
2. Exploração
3. Modelagem
4. Validação
5. Caso de estudo
6. API Flask
7. Frontend
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

## Comandos úteis (a partir de `backend/`)
- Testes: `.venv\Scripts\python -m pytest`
- Lint: `.venv\Scripts\python -m ruff check .` e `.venv\Scripts\python -m ruff format .`
