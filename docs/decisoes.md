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
- **Atualização (etapa 1):** na prática, a API histórica com `models=best_match` já vem completa
  até ontem; o `past_days` ficou como reserva. Ver D21.

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
- **Na prática:** a sensação **não é apoio da temperatura** — é prevista sozinha, a partir do seu
  próprio histórico, com os mesmos 4 modelos, métricas, gráficos e caso de estudo. As duas
  previsões são independentes (nada garante que a sensação prevista fique acima da temperatura
  prevista). Ver também D19.

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
- **Escolha:** CSV em `backend/data/fortaleza_diario.csv` (colunas `data`, `temperatura_media`,
  `sensacao_media`, `fonte`). O nome mudou de `temperatura_fortaleza.csv` porque o arquivo guarda
  as duas variáveis.
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

## D19 — Não usar umidade e vento para prever a sensação térmica
- **Decisão:** acrescentar umidade e vento como variáveis externas (exógenas) para tentar
  prever a sensação térmica com mais precisão.
- **Opções consideradas:** (a) manter o escopo atual — sensação prevista só pelo próprio
  histórico; (b) SARIMAX/Prophet com umidade e vento previstos pelos nossos próprios modelos;
  (c) usar a previsão de umidade e vento do Open-Meteo; (d) experimento extra em "modo oráculo"
  (usar no teste os valores reais de umidade e vento) só para medir o ganho máximo possível.
- **Escolha:** (a) — manter o escopo atual.
- **Por quê:** para prever a sensação de amanhã com umidade e vento, precisaríamos saber a umidade
  e o vento de amanhã. Em (b) os erros dessas previsões se somam ao erro da sensação; em (c) o
  Open-Meteo já entrega a sensação prevista pronta, e a POC viraria só um repasse; (d) mostra um
  teto, mas não serve para prever de verdade. Além disso, linha de base e ETS não aceitam
  variáveis externas (comparação desigual), e com só 90 dias cada variável a mais aumenta o risco
  de overfitting. A limitação fica registrada no relatório final, e o uso de variáveis externas
  entra como próximo passo para produção.

## D20 — Último dia da série: ontem, não hoje
- **Decisão:** qual é o último dia dos "90 dias até hoje".
- **Opções consideradas:** incluir hoje; terminar ontem.
- **Escolha:** os 90 dias que terminam **ontem** (o último dia completo).
- **Por quê:** durante o dia, a "média de hoje" mistura horas já observadas com horas ainda
  previstas — seria um dado incompleto se passando por real. Hoje passa a ser o **primeiro dia
  previsto**, e não o último observado.

## D21 — Modelo da API histórica: `best_match` (e `past_days` só como reserva)
- **Decisão:** qual modelo meteorológico pedir à API histórica e como tratar os dias recentes.
- **Opções consideradas:** (a) `era5` puro (reanálise, ~6 dias de atraso) + `past_days` da API
  de previsão para os dias faltantes — o plano original; (b) `best_match` (o Open-Meteo escolhe o
  melhor modelo para o local), com `past_days` só como reserva.
- **Escolha:** (b).
- **Por quê:** medimos as duas opções (25/11/2026):
  - `best_match` veio completo até ontem e é **idêntico** à API de previsão nos 30 dias em comum
    (diferença 0,0 °C) — ou seja, é a mesma fonte, sem emenda.
  - `era5` puro termina 6 dias antes e é **sistematicamente mais frio**: −0,6 °C na temperatura e
    −0,9 °C na sensação (correlação 0,86 e 0,96 com o `best_match`). Hipótese: a célula da ERA5
    (~25 km) inclui parte do oceano.
  - Com (a), os últimos 6 dias viriam de outra fonte, ~0,6–0,9 °C mais quente: um **salto
    artificial** justamente no período do caso de estudo, que o modelo confundiria com mudança real.
  - O `past_days=30` continua no código: se a API histórica atrasar, ele preenche os buracos, e a
    comparação da sobreposição mostra se as fontes divergem.

## D22 — Testes da coleta sem internet
- **Decisão:** como testar o código que chama a API.
- **Opções consideradas:** testar chamando a API de verdade; usar respostas falsas montadas à mão.
- **Escolha:** respostas falsas no formato do Open-Meteo; a chamada real fica no script da etapa.
- **Por quê:** testes que dependem da internet falham por motivos alheios ao código (rede fora,
  API lenta) e mudam de resultado com o tempo. Com dados falsos, testamos exatamente os casos
  difíceis (null, buraco, duplicata, prioridade entre fontes) sempre do mesmo jeito.

## D23 — Manter 90 dias diários de Fortaleza, apesar da pouca variação
- **Decisão:** a pouca variação da série (desvio-padrão de 0,5 °C) atrapalha a POC? Trocar algo?
- **Opções consideradas:** (a) manter 90 dias diários de Fortaleza; (b) dados horários (2.160
  pontos, ciclo de 24 h); (c) outra cidade com mais variação (ex.: Porto Alegre); (d) histórico
  maior (6 meses, 1 ano, 2–3 anos).
- **Escolha:** (a).
- **Por quê:**
  - O que torna uma série previsível não é variar muito, e sim ter **padrão**: a autocorrelação
    de 1 dia é 0,75 (temperatura) e 0,87 (sensação) — a série tem memória.
  - (b) muda o problema (prever 168 horas, não 7 médias diárias) e o ciclo dia/noite é tão fácil
    que infla a "precisão"; (c) foge do pedido do cliente e frentes frias são eventos, não padrões.
  - (d) Fortaleza tem ciclo anual de ~2 °C. Com 6 meses, o modelo misturaria estações sem saber;
    com 1 ano, há só um ciclo (é preciso ver o padrão repetir ao menos 2 vezes). Com 2–3 anos o
    projeto mudaria (climatologia como linha de base, Prophet com sazonalidade anual, validação em
    várias janelas) — fica como próximo passo no relatório final.
  - Consequência aceita: os erros serão pequenos em °C e a linha de base (~0,4 °C de MAE) será
    difícil de bater; diferenças pequenas entre modelos em 10 dias de teste podem ser sorte.

## D24 — Contexto de 3 anos: só para entender, nunca para treinar
- **Decisão:** como usar dados mais antigos sem mudar o escopo de 90 dias.
- **Opções consideradas:** não usar; (1) série contínua de 3 anos; (2) o mesmo período do
  calendário (28/08 a 25/11) em cada ano, sobreposto; treinar com eles.
- **Escolha:** gráficos (1) e (2), em `docs/img/etapa2_contexto.png`, a partir de
  `backend/data/fortaleza_contexto_3anos.csv` (1.096 dias, mesma fonte `best_match`). Os modelos
  continuam treinando só com os 90 dias. **Climatologia** ("normal") = média de 2024 e 2025 no mesmo
  dia, suavizada com média móvel centrada de 7 dias (com só 2 anos a média é ruidosa).
  **Anomalia** = 2026 − climatologia.
- **Por quê:** (1) mostra onde nossos 90 dias estão no ciclo anual; (2) separa o que é **estação**
  (todos os anos sobem de agosto a novembro) do que é **anomalia** (2026 acima dos outros anos). A
  sugestão do gráfico (2) veio do usuário.

## D25 — Padrões dos gráficos
- **Decisão:** cores e formato dos gráficos do projeto.
- **Opções consideradas:** cores padrão do matplotlib; paleta fixa por variável.
- **Escolha:** temperatura sempre **azul** (`#2a78d6`), sensação sempre **laranja** (`#eb6834`)
  — paleta categórica validada para daltonismo. Um painel por variável (nunca dois eixos verticais
  no mesmo gráfico). Na comparação entre anos, anos anteriores em cinza e só o ano atual colorido.
- **Por quê:** a mesma cor para a mesma coisa em todos os gráficos (inclusive no frontend) evita
  confusão. Dois eixos verticais com escalas diferentes enganam a leitura.

## D26 — Detecção do ponto de mudança
- **Decisão:** como achar a data da "mudança forte" para o caso de estudo.
- **Opções consideradas:** só olhar o gráfico; biblioteca `ruptures`; método próprio simples.
- **Escolha:** método próprio (`exploracao.detectar_mudanca`): testa cada data de corte e escolhe
  a que melhor divide a série em dois trechos com médias diferentes (menor soma dos quadrados dos
  desvios), com no mínimo 10 dias de cada lado. Aplicado à **anomalia**, não à série bruta.
- **Por quê:** ~10 linhas que dá para entender inteiras, sem dependência nova. Na série bruta o
  método confunde a subida da estação com mudança; na anomalia, a estação já foi descontada.
  Resultado: **15/10** (temperatura, +0,49 → +0,86 °C) e **23/10** (sensação, +1,35 → +1,96 °C).

## D27 — Interface comum dos modelos
- **Decisão:** como organizar os 4 modelos no código.
- **Opções consideradas:** uma classe por modelo com herança; uma função por modelo com a mesma
  assinatura; código separado em cada script.
- **Escolha:** uma função por modelo (`prever_linha_base`, `prever_ets`, `prever_sarima`,
  `prever_prophet`), todas com a assinatura `(serie, horizonte, nivel) -> Previsao`, registradas
  no dicionário `MODELOS` e acessadas por `prever(nome, ...)`. `Previsao` tem a `tabela`
  (previsao, inferior, superior por data) e os `detalhes` (o que o modelo escolheu).
- **Por quê:** funções são mais simples de ler que classes; a assinatura única permite que a
  avaliação (etapa 4) e a API (etapa 6) tratem todos os modelos igual. Um teste de "contrato"
  garante que todos devolvem a mesma estrutura.

## D28 — Escolha da configuração por AICc, refeita a cada treino
- **Decisão:** como escolher a configuração do ETS e do SARIMA.
- **Opções consideradas:** fixar à mão com as pistas da etapa 2; testar várias e escolher por
  AIC, AICc ou BIC; escolher pelo erro no período de teste.
- **Escolha:** testar candidatos e ficar com o **menor AICc**. A busca faz parte do modelo e roda
  sobre os dados que ele recebe (na etapa 4, só os 80 dias de treino).
- **Por quê:** o AICc equilibra ajuste e simplicidade e corrige o AIC para séries curtas (nossos
  90 pontos). Escolher pelo erro no teste seria "espiar a prova": o teste deixaria de medir o
  desempenho em dados novos.

## D29 — Intervalo da linha de base pelos erros passados
- **Decisão:** como dar uma faixa de incerteza à regra "média dos últimos 7 dias", que não tem
  fórmula estatística.
- **Opções consideradas:** desvio-padrão da série; desvio dos erros de 1 dia para todos os
  horizontes; desvio dos erros passados **para cada distância** (1 a 7 dias).
- **Escolha:** para cada distância h, aplicamos a regra em todos os dias do passado, medimos o
  erro h dias depois e usamos ±1,96 × desvio-padrão desses erros.
- **Por quê:** é honesto (mostra quanto a própria regra errou) e a faixa cresce com a distância.
  Limitação: supõe erros simétricos e parecidos com os do passado.

## D30 — ETS: `ETSModel`, erro aditivo, 3 candidatos sem sazonalidade
- **Decisão:** qual implementação e quais configurações do ETS.
- **Opções consideradas:** `ExponentialSmoothing` (Holt-Winters clássico) ou `ETSModel` do
  statsmodels; com/sem tendência, amortecida, sazonalidade de 7 dias.
- **Escolha:** `ETSModel` com erro aditivo; candidatos: sem tendência, tendência, tendência
  amortecida; nenhum com sazonalidade.
- **Por quê:** o `ETSModel` calcula intervalos de previsão (o `ExponentialSmoothing` não). A
  etapa 2 não achou padrão semanal (força ~0,1), então sazonalidade só acrescentaria parâmetros.

## D31 — SARIMA: 72 candidatos (p, q, parte sazonal, tendência)
- **Decisão:** quais combinações do SARIMA testar.
- **Opções consideradas:** fixar ARIMA(1,1,0); busca ampla (p, q até 5); busca moderada;
  biblioteca `pmdarima` (`auto_arima`).
- **Escolha:** busca própria e moderada: p e q de 0 a 2; parte sazonal de 7 dias (P, Q de 0 a 1)
  **como candidata**; com/sem tendência — 72 combinações (~6–20 s). O d vem antes, por teste (D33).
- **Por quê:** com 90 pontos, ordens altas só decoram ruído. Incluir a sazonalidade semanal como
  candidata deixa os dados confirmarem a etapa 2 (e confirmaram: o melhor sazonal ficou em 3º/5º).
  Busca própria = código visível e sem dependência nova.

## D32 — Prophet sem sazonalidades
- **Decisão:** configuração do Prophet.
- **Opções consideradas:** padrão (sazonalidades anual e semanal automáticas); tudo desligado.
- **Escolha:** `yearly_seasonality`, `weekly_seasonality` e `daily_seasonality` desligadas;
  `interval_width=0.95`; semente fixa (`np.random.seed(0)`) antes de prever.
- **Por quê:** 90 dias não contêm um ano (a sazonalidade anual seria inventada) e não há padrão
  semanal. Sobra a tendência linear por partes — o que mostra bem como o Prophet se comporta
  numa série curta. A semente fixa torna o intervalo (feito por simulação) reproduzível.

## D33 — SARIMA: d escolhido pelo teste ADF **com tendência** (correção da etapa 2)
- **Decisão:** quantas diferenciações (d) usar no SARIMA.
- **Opções consideradas:** (a) d = 1 fixo, pela etapa 2; (b) deixar o AICc escolher d;
  (c) escolher d por teste estatístico e o resto por AICc (método do `auto.arima`).
- **Escolha:** (c) — ADF com tendência (`regression="ct"`) na série de treino: p < 0,05 → d = 0
  com tendência linear; senão d = 1 com drift opcional.
- **Por quê:** com d = 1 fixo, o SARIMA da sensação ajustou o termo MA em **−1,0**: sinal de
  **sobrediferenciação** — o modelo "desfazendo" a diferença. O ADF da etapa 2 só testou
  estacionariedade em torno de um nível constante; com tendência, a sensação é estacionária
  (p = 0,002). A temperatura ficou inconclusiva (p = 0,17) e manteve d = 1 (o MA continua perto
  de −1: com 90 pontos o teste tem pouca força). (b) não funciona: AICc de modelos com d diferente
  não é comparável (medem o ajuste sobre dados diferentes).

## D34 — Métricas extras e forma de ler a validação
- **Decisão:** além de MAE, RMSE e cobertura (D08), o que mostrar para interpretar o teste.
- **Opções consideradas:** só as 3 métricas; métricas extras; teste estatístico de diferença
  entre modelos (ex.: Diebold-Mariano).
- **Escolha:** extras **auxiliares**: MAE nos dias 1–7 (horizonte do produto), viés (erro médio
  com sinal) e MAE relativo à linha de base (%); tabela de erro dia a dia; no gráfico, real dentro
  da faixa = ●, fora = ✕. Sem teste estatístico formal.
- **Por quê:** o teste tem 10 dias, mas o produto prevê 7; o MAE relativo responde direto "vale a
  pena trocar a regra simples?" (dúvida da D23); o erro dia a dia mostra se um único dia decide o
  ranking. Com 10 dias, um teste formal teria pouco poder — mostrar os erros é mais honesto.
- **Teste anti-vazamento:** um teste automático altera os valores do período de teste e confere
  que a previsão não muda (o modelo nunca vê a prova).
