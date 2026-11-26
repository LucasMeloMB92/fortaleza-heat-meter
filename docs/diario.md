# Diário do projeto

Registro de cada etapa: o que foi feito, os resultados e o que aprendi.

---

## Etapa 0 — Preparação (2026-11-26)

### O que foi feito
- Plano aprovado: monorepo com `/backend`, `/frontend` e `/docs`, 9 etapas (0 a 8).
- Escopo ampliado: além da temperatura média, vamos prever a **sensação térmica média**
  (decisão D02, opção a).
- Python 3.12.10 instalado com `py install 3.12` (o 3.15 do sistema continua lá — decisão D11).
- Repositório Git criado (branch `main`) e `.gitignore` (ignora `.venv`, caches, `node_modules`).
- Ambiente virtual `backend/.venv` com as bibliotecas fixadas em `requirements.txt`:
  pandas 3.1.1, numpy 2.5.5, requests 2.34.2, matplotlib 3.11.2, statsmodels 0.15.0,
  prophet 1.5.0, Flask 3.1.3, flask-cors 6.0.5, pytest 9.2.0, ruff 0.17.6.
- `pyproject.toml` configurando ruff e pytest.
- Teste de ambiente (`tests/test_ambiente.py`): importa as bibliotecas e treina um Prophet com
  30 dias fictícios.
- Documentação inicial: `CLAUDE.md`, `README.md` e os arquivos de `docs/`.

### Resultados
- `ruff check`: sem erros (após um ajuste — ver abaixo).
- `pytest`: **2 testes passaram**. Avisos vindos de dentro do Prophet (uso de recurso do pandas
  que será descontinuado) — não afetam o funcionamento.

### O que aprendi
- **Ambiente virtual** isola as bibliotecas de cada projeto; versões fixadas no
  `requirements.txt` tornam o ambiente reproduzível.
- **Versão nova nem sempre é melhor:** o Python 3.15 é recente demais para o ecossistema
  científico; o 3.12 é a escolha segura.
- **Teste de fumaça:** um teste simples que "liga o motor" (treinar um Prophet minúsculo) detecta
  problemas de instalação antes de começarmos o trabalho de verdade.
- **Linter na prática:** o ruff apontou uma linha com 106 caracteres (limite 100); o
  `ruff format` corrigiu automaticamente.

### Dúvidas discutidas após a etapa
- **"A sensação térmica é só apoio da temperatura?"** Não: ela é prevista sozinha, com os mesmos
  modelos e métricas (D02 reescrita para deixar isso claro). A "variável auxiliar" era a opção
  descartada.
- **"Adicionar umidade e vento deixaria a sensação mais precisa?"** Em teoria, sim, mas para
  prever o futuro precisaríamos também da umidade e do vento futuros, que ainda não aconteceram.
  Prevê-los soma erros; usar a previsão pronta do Open-Meteo esvazia a POC. Decidimos manter o
  escopo (D19).
- **Lição:** uma variável que ajuda a *explicar* o passado nem sempre ajuda a *prever* o futuro.
  Ela só ajuda se o valor futuro dela for conhecido ou fácil de prever.

---

## Etapa 1 — Coleta de dados (2026-11-26)

### O que foi feito
- `backend/previsao/coleta.py`: funções pequenas e separadas — calcular o período, baixar as
  duas APIs, converter JSON em tabela, juntar as fontes (histórico tem prioridade), verificar a
  tabela (dias faltando, duplicados, vazios) e comparar as fontes nos dias em comum.
- `backend/scripts/etapa1_coleta.py`: roda a coleta real, salva o CSV e imprime um resumo.
- `backend/tests/test_coleta.py`: 8 testes com respostas falsas (sem internet — D22).
- Dados salvos em `backend/data/fortaleza_diario.csv`.

### Resultados
- **Período:** 28/08/2026 a 25/11/2026 — **90 dias, todos da API histórica** (`best_match`),
  sem dias faltando nem valores vazios.

| °C | Temperatura média | Sensação média |
|---|---|---|
| Média | 28,15 | 30,87 |
| Desvio-padrão | 0,52 | 0,88 |
| Mínimo | 27,2 | 29,5 |
| Máximo | 29,3 | 32,9 |
| Últimos 3 dias | 29,2 / 29,3 / 29,1 | 32,9 / 32,3 / 32,0 |

- **Comparação de fontes** (feita para investigar a diferença 0,0 °C entre histórico e previsão):

| Fonte | Último dia | Temp. média | Sensação média |
|---|---|---|---|
| `best_match` | 25/11 | 28,09 | 30,78 |
| `era5` puro | 19/11 | 27,50 | 29,87 |

- `pytest`: 10 testes passaram. `ruff`: sem erros.

### O que aprendi
- **Desconfie de resultado perfeito demais.** A diferença 0,0 °C entre as fontes parecia ótima,
  mas indicava que as duas APIs eram, na verdade, a mesma fonte. Investigar revelou que a ERA5
  pura é ~0,6 °C mais fria em Fortaleza.
- **Emendar fontes diferentes pode fabricar uma quebra estrutural.** O plano original (ERA5 +
  previsão nos últimos dias) criaria um salto artificial exatamente no período que queremos
  estudar. Consistência da fonte importa mais que "a fonte mais nobre" (D21).
- **Fortaleza varia pouco:** desvio-padrão de 0,5 °C na temperatura. As "mudanças fortes" serão
  de ~1–2 °C — pequenas em valor absoluto, mas grandes perto da variação normal. A sensação varia
  ~70% mais que a temperatura (0,88 x 0,52), como esperávamos (umidade e vento).
- **Os últimos dias estão no topo da série** (29,1–29,3 °C, perto do máximo de 29,3): primeiro
  indício da mudança recente, a ser analisada na etapa 2.
- **Hoje não entra na série** (D20): a média de um dia incompleto é parte previsão.
