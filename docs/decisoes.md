# Registro de decisões

Cada entrada segue o formato **Decisão / Opções consideradas / Escolha / Por quê**.
Decisões marcadas com _(cliente/usuário)_ vieram do pedido inicial; as demais foram propostas
durante o projeto e aprovadas.

---

## D01 — Fonte dos dados _(cliente/usuário)_
- **Decisão:** de onde vêm os dados de temperatura.
- **Opções consideradas:** Open-Meteo; INMET (estações oficiais brasileiras); APIs pagas
  (OpenWeather, Visual Crossing).
- **Escolha:** API histórica do Open-Meteo; se faltarem os dias mais recentes (a base histórica
  tem alguns dias de atraso), completar com o parâmetro `past_days` da API de previsão.
- **Por quê:** gratuita, sem cadastro nem chave de API, devolve JSON pronto por dia e por fuso
  horário. A complementação com `past_days` garante a série "até hoje".

## D02 — Variáveis monitoradas _(usuário)_
- **Decisão:** quais séries prever.
- **Opções consideradas:** (a) temperatura e sensação térmica como duas séries completas
  (mesmos modelos, métricas e caso de estudo); (b) sensação só exibida no gráfico, sem previsão;
  (c) sensação como variável auxiliar da temperatura (modelo multivariado, ex.: SARIMAX).
- **Escolha:** (a) — temperatura média diária (`temperature_2m_mean`) e sensação térmica média
  diária (`apparent_temperature_mean`).
- **Por quê:** o código é o mesmo com a variável como parâmetro, e a comparação ensina algo: a
  sensação depende de umidade e vento, então deve oscilar mais e ter erros/intervalos maiores.
  A opção (c) exigiria prever a variável auxiliar antes de prever a principal — complexo demais
  para uma POC.

## D03 — Local e fuso horário _(cliente/usuário)_
- **Decisão:** ponto geográfico e fuso.
- **Opções consideradas:** coordenadas do centro de Fortaleza; de uma estação específica.
- **Escolha:** lat -3.72, lon -38.54, fuso `America/Fortaleza`.
- **Por quê:** o fuso define onde o "dia" começa e termina; com o fuso local, a média diária
  corresponde ao dia do calendário de Fortaleza (e não ao dia em UTC, 3 h adiantado).

## D04 — Período da série _(cliente/usuário)_
- **Decisão:** quantos dias de histórico usar.
- **Opções consideradas:** 30, 60 ou 90 dias (pedido do cliente: 1 a 3 meses); anos de histórico.
- **Escolha:** últimos 90 dias até hoje.
- **Por quê:** é o máximo pedido pelo cliente; mais dados = estimativas mais estáveis, sem sair do
  escopo de "série pequena".

## D05 — Horizonte de previsão _(cliente/usuário)_
- **Decisão:** quantos dias à frente prever.
- **Opções consideradas:** 3, 7 ou 14 dias.
- **Escolha:** 7 dias.
- **Por quê:** uma semana é útil para o cliente e ainda curto o bastante para um modelo treinado
  com 90 dias. Quanto mais longe, maior a incerteza.

## D06 — Estratégia de validação _(cliente/usuário)_
- **Decisão:** como medir se o modelo acerta.
- **Opções consideradas:** separar o final da série como teste (*holdout*); validação cruzada em
  janelas deslizantes (*rolling origin*).
- **Escolha:** os últimos 10 dias como teste; treino com os 80 anteriores.
- **Por quê:** em séries temporais não se embaralham os dados — o teste precisa ser o "futuro" do
  treino. O holdout simples é fácil de explicar ao cliente. Observação: no teste prevemos 10 dias;
  na previsão final (7 dias) o modelo é retreinado com os 90 dias.

## D07 — Modelos comparados _(cliente/usuário)_
- **Decisão:** quais modelos treinar.
- **Opções consideradas:** linha de base ingênua; ETS/Holt-Winters; SARIMA; Prophet; modelos de
  machine learning (ex.: gradient boosting) ou redes neurais.
- **Escolha:** (1) linha de base = média dos últimos 7 dias; (2) ETS (statsmodels);
  (3) SARIMA (statsmodels); (4) Prophet, só como comparação.
- **Por quê:** a linha de base é a régua — um modelo só vale se superá-la. ETS e SARIMA são os
  clássicos para séries curtas. Prophet foi pensado para séries longas com sazonalidades
  marcadas; incluí-lo mostra o que acontece quando a ferramenta não combina com o problema.
  ML/redes neurais precisam de muito mais dados que 90 pontos.

## D08 — Métricas _(cliente/usuário)_
- **Decisão:** como comparar os modelos.
- **Opções consideradas:** MAE, RMSE, MAPE, cobertura do intervalo.
- **Escolha:** MAE, RMSE e cobertura do intervalo (% de dias reais dentro da faixa prevista).
- **Por quê:** MAE e RMSE ficam em °C (fáceis de explicar); RMSE pune mais os erros grandes.
  A cobertura avalia se a faixa de incerteza é honesta. MAPE (erro percentual) foi descartado:
  em temperatura, percentual não tem significado intuitivo.

## D09 — Caso de estudo: quebra estrutural _(cliente/usuário)_
- **Decisão:** como estudar o efeito das mudanças fortes recentes de temperatura.
- **Opções consideradas:** ignorar; comparar modelo treinado só antes da mudança x com tudo.
- **Escolha:** comparar os dois modelos no mesmo período, para as duas variáveis.
- **Por quê:** mostra na prática que um modelo só "conhece" o passado que viu — se o regime
  mudou, dados antigos podem atrapalhar.

## D10 — Tamanho do intervalo de confiança
- **Decisão:** largura da faixa de incerteza.
- **Opções consideradas:** 80% ou 95%.
- **Escolha:** 95%.
- **Por quê:** é o padrão das bibliotecas (statsmodels usa `alpha=0.05`) e fica comparável entre
  os modelos. Limitação: com 10 dias de teste, a cobertura só varia de 10 em 10 pontos percentuais.

## D11 — Versão do Python
- **Decisão:** qual Python usar no backend.
- **Opções consideradas:** Python 3.15 (já instalado); Python 3.12.
- **Escolha:** Python 3.12 (instalado com `py install 3.12`, convivendo com o 3.15).
- **Por quê:** o 3.15 é muito novo — bibliotecas científicas (prophet/cmdstanpy, statsmodels)
  podem não ter pacotes prontos para ele e a compilação no Windows costuma falhar. O 3.12 é
  estável e suportado por todas.

## D12 — Backend: Flask + Flask-CORS _(cliente/usuário)_
- **Decisão:** framework da API.
- **Opções consideradas:** Flask; FastAPI; Django REST Framework.
- **Escolha:** Flask com Flask-CORS.
- **Por quê:** mínimo e fácil de entender para quem está aprendendo. Flask-CORS libera o
  frontend (outra origem/porta) a chamar a API.

## D13 — Frontend: React + Vite + TypeScript, Recharts, TanStack Query, Tailwind _(cliente/usuário)_
- **Decisão:** tecnologias da tela.
- **Opções consideradas:** dashboards prontos em Python (Streamlit, Dash); SPA em React.
- **Escolha:** React + Vite + TypeScript; Recharts (gráficos); TanStack Query (consumo da API com
  cache e estados de carregamento); Tailwind (estilo).
- **Por quê:** é a stack definida para a ferramenta web; Recharts permite linha tracejada e área
  sombreada para o intervalo.

## D14 — Armazenamento: CSV
- **Decisão:** onde guardar os dados coletados.
- **Opções consideradas:** CSV; SQLite.
- **Escolha:** CSV em `backend/data/`.
- **Por quê:** são ~90 linhas — um CSV abre no Excel, é lido direto pelo pandas e o Git mostra
  as mudanças linha a linha. SQLite só compensaria com consultas complexas ou muitos dados.

## D15 — Estrutura: monorepo com pacote `previsao/` separado do Flask
- **Decisão:** como organizar o código Python.
- **Opções consideradas:** tudo no `app.py`; lógica num pacote separado e o Flask só "embalando".
- **Escolha:** pacote `backend/previsao/` (coleta, exploração, modelos, avaliação, caso de estudo)
  independente da web; `app.py` só chama suas funções.
- **Por quê:** dá para testar e rodar os modelos sem subir servidor, e a API fica fina e simples.

## D16 — Scripts `.py` em vez de notebooks Jupyter
- **Decisão:** formato das etapas de análise (coleta → caso de estudo).
- **Opções consideradas:** notebooks Jupyter; scripts Python.
- **Escolha:** um script por etapa em `backend/scripts/`, salvando gráficos em `docs/img/`.
- **Por quê:** diff limpo no Git, verificação pelo ruff e reaproveitamento do mesmo código pela
  API. Os gráficos gerados entram no diário.

## D17 — Gestão de dependências
- **Decisão:** como declarar as bibliotecas.
- **Opções consideradas:** `requirements.txt`; `pyproject.toml` com dependências; Poetry/uv.
- **Escolha:** `requirements.txt` com versões fixadas (`==`); `pyproject.toml` só para
  configurar ruff e pytest.
- **Por quê:** `pip install -r requirements.txt` é o caminho mais conhecido; versões fixadas
  garantem que todos tenham o mesmo ambiente.

## D18 — Regras de qualidade (ruff + pytest)
- **Decisão:** quais verificações rodar no código.
- **Opções consideradas:** só as regras padrão do ruff; conjunto ampliado.
- **Escolha:** ruff com `E`, `F` (erros básicos), `I` (ordem dos imports), `B` (armadilhas
  comuns), `UP` (sintaxe moderna); linha de até 100 caracteres; `ruff format` como formatador.
  pytest com um teste de ambiente que treina um Prophet minúsculo.
- **Por quê:** pega erros reais sem virar burocracia. O teste do Prophet existe porque é a
  instalação mais frágil no Windows (depende do CmdStan compilado).
