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

## D35 — Desenho do caso de estudo (quebra estrutural)
- **Decisão:** como comparar "modelo treinado só antes da mudança" x "treinado com tudo".
- **Opções consideradas:** (a) cada modelo avaliado numa janela diferente (logo após o próprio
  treino); (b) todos avaliados na **mesma janela de teste** (16/11–25/11), cada um prevendo do fim
  do seu treino até o fim do teste; (c) reaproveitar os parâmetros aprendidos "antes" aplicando-os
  aos dados recentes sem reaprender. Também: uma data comum ou uma por variável; incluir ou não um
  cenário "só depois".
- **Escolha:** (b), com data por variável (15/10 temperatura, 23/10 sensação — recalculadas a
  partir dos dados, D26), os 4 modelos e **três** cenários: só antes, tudo e só depois (extra).
  O script mostra também o erro do "só antes" nos 10 primeiros dias após a mudança.
- **Por quê:** a mesma janela torna os números comparáveis com a etapa 4. A ressalva de (b) é que
  o "só antes" prevê de mais longe (34–42 dias): para linha de base e ETS isso não muda a
  previsão (é uma reta horizontal), só a faixa; para SARIMA e Prophet, muda — por isso o erro
  "logo após a mudança" separa o efeito da distância. (c) é mais sutil e difícil de explicar.
  O cenário "só depois" responde à pergunta prática "vale descartar o passado?".

## D36 — Linha de base com horizonte longo (ajuste da D29)
- **Decisão:** o que fazer quando o horizonte é maior que o histórico disponível para medir o
  erro (caso de estudo: 48 dias de treino, 42 de horizonte → o cálculo dava NaN).
- **Opções consideradas:** recusar horizontes longos; extrapolar o crescimento do erro; repetir o
  desvio da maior distância mensurável.
- **Escolha:** exigir pelo menos 10 exemplos de erro por distância; acima da maior distância
  mensurável, repetir o desvio dela. Série curta demais (< 17 dias) → erro claro.
- **Por quê:** simples e sem inventar dados; limitação documentada no código: nesses casos a faixa
  para de crescer e tende a ficar estreita demais.

## D37 — Quando treinar os modelos na API: sob demanda, com cache em memória
- **Decisão:** em que momento a API treina os modelos (substitui a ideia do plano inicial de
  "treinar tudo ao iniciar o servidor").
- **Opções consideradas:** (a) treinar tudo quando o servidor inicia; (b) treinar no primeiro
  pedido e guardar na memória (`functools.lru_cache`); (c) script que pré-calcula arquivos JSON
  e a API só os lê.
- **Escolha:** (b).
- **Por quê:** (a) faria cada início levar ~1–2 min (só o caso de estudo leva ~30 s), e o modo
  `--debug` reinicia o servidor a cada edição de código. (c) é rápido mas cria arquivos que
  ficam velhos e um passo a mais para lembrar. Com (b), o primeiro pedido de cada combinação
  demora (o frontend mostra "carregando") e os seguintes levam milissegundos (medido: SARIMA
  6,3 s → 3 ms; caso de estudo 29 s → 5 ms). Limitação: dois pedidos iguais simultâneos antes
  do cache podem calcular duas vezes — aceitável numa POC.

## D38 — Formato da API: rotas, parâmetros e respostas
- **Decisão:** como expor os resultados.
- **Opções consideradas:** uma rota única com tudo; uma rota por necessidade da tela; GET x POST;
  nomes de variável iguais às colunas (`temperatura_media`) ou curtos.
- **Escolha:** 7 rotas `GET` (saude, opcoes, serie, previsao, metricas, teste, caso-estudo);
  parâmetros na URL com padrões (`variavel=temperatura`, `modelo=sarima`, `horizonte=7`);
  identificadores curtos `temperatura`/`sensacao`; datas `AAAA-MM-DD`, números com 2 casas, `null`
  no lugar de NaN; `/api/previsao` devolve histórico + previsão juntos.
- **Por quê:** cada rota corresponde a um elemento da tela (o frontend faz pedidos pequenos e
  independentes). GET porque nada é alterado — e respostas GET podem ser guardadas em cache pelo
  navegador e pelo TanStack Query. `/api/opcoes` evita repetir a lista de modelos no frontend.
  Horizonte limitado a 14 dias: com 90 dias de treino, além disso a previsão vira uma reta sem
  sentido. Padrão `sarima` = o mais consistente na etapa 4.

## D39 — CORS só para o frontend de desenvolvimento
- **Decisão:** quais sites podem chamar a API pelo navegador.
- **Opções consideradas:** qualquer origem (`*`); só o frontend; usar um proxy no Vite e
  dispensar CORS.
- **Escolha:** Flask-CORS liberando só `http://localhost:5173` e `http://127.0.0.1:5173`, nas
  rotas `/api/*`. (O proxy do Vite também será configurado na etapa 7.)
- **Por quê:** `*` deixaria qualquer página aberta no navegador consultar a API local. Liberar só
  a origem do frontend é o mínimo necessário. Para outro endereço (ex.: produção), basta
  acrescentá-lo em `ORIGENS_PERMITIDAS` no `app.py`.

## D40 — Erros sempre em JSON, em português, sem vazar detalhes internos
- **Decisão:** como a API responde quando algo dá errado.
- **Opções consideradas:** páginas HTML padrão do Flask (em inglês); JSON padronizado.
- **Escolha:** JSON com `erro` (mensagem em português) e `parametro`/`valores_aceitos` (400) ou
  `status` (404, 405, 500). Erro 500 devolve mensagem genérica; o detalhe vai só para o terminal.
- **Por quê:** o frontend consegue ler e mostrar a mensagem; a lista de valores aceitos ajuda
  quem chama a API a corrigir o pedido. Esconder detalhes do erro 500 evita expor caminhos e
  código do servidor.

> **Atualização da D37 (etapa 7):** ao abrir a tela, o navegador faz 4 pedidos pesados ao mesmo
> tempo. Com o cálculo em paralelo, todos ficavam lentos (95 s para carregar tudo; o gráfico
> principal só em 42 s) e `/metricas` e `/teste` calculavam a mesma validação duas vezes. Motivo:
> o **GIL** do Python — threads não executam código Python de verdade em paralelo. Solução: uma
> **fila única** (`threading.RLock`) — cálculos novos rodam um de cada vez; os já feitos respondem
> sem esperar. Medido: gráfico principal em 10 s (era 42 s), métricas em 27 s (era 64 s); cada
> cálculo roda uma vez só (há teste para isso). A trava é reentrante porque um cálculo pode chamar
> outro (ex.: caso de estudo → leitura dos dados).

## D41 — Datas exibidas em DD-MM-AAAA (e números no padrão brasileiro) _(usuário)_
- **Decisão:** formato das datas que aparecem na ferramenta.
- **Opções consideradas:** (a) a API passar a devolver `DD-MM-AAAA`; (b) a API continua em
  `AAAA-MM-DD` (ISO 8601) e o frontend converte só na exibição.
- **Escolha:** (b). Toda data exibida (eixos, tooltips, tabelas, textos) passa por uma única
  função, `formatarData` (`frontend/src/formatacao.ts`), coberta por testes. Números com vírgula
  decimal e "°C" (`29,10 °C`), via `Intl.NumberFormat('pt-BR')`.
- **Por quê:** `AAAA-MM-DD` é o formato para máquinas — ordena certo como texto e qualquer
  linguagem entende; `DD-MM-AAAA` é para pessoas. Mudar a API quebraria o contrato do `api.md` e
  complicaria a ordenação. A conversão é feita no texto, **sem** `new Date()`: no fuso de
  Fortaleza (UTC−3), `new Date("2027-01-01")` vira 31/12/2026 às 21h — o dia errado (há teste).
- Os gráficos PNG da documentação (etapas 2–5, gerados em Python) continuam com `DD/MM` nos eixos.

## D42 — Frontend: organização e comportamento
- **Decisão:** como montar a tela com a stack definida (React + Vite + TS, Recharts, TanStack
  Query, Tailwind).
- **Opções consideradas:** URL da API fixa no código x proxy do Vite; manter o gráfico anterior
  enquanto o novo carrega (`placeholderData`) x mostrar "Treinando…"; com ou sem testes no
  frontend.
- **Escolha:**
  - **Proxy do Vite** (`/api` → `http://127.0.0.1:5000`): o código chama `/api/...` sem URL fixa.
  - **TanStack Query** com `staleTime: Infinity` (os dados só mudam ao reiniciar o servidor) —
    voltar a uma combinação já vista é instantâneo.
  - **Sem `placeholderData`**: no teste da tela, manter o gráfico antigo sob o título novo
    ("Prophet", mas mostrando SARIMA) confundia; agora a seção mostra "Treinando o modelo…".
  - **Tailwind v4** com o plugin oficial do Vite; cores do projeto (D25) como variáveis de tema.
  - **Vitest** para testar a formatação (datas e números). Lint com **oxlint** e TypeScript 7,
    que já vêm no template atual do Vite.
  - Configuração dos eixos num lugar só (`componentes/eixos.ts`), usada pelos 3 gráficos.
- **Por quê:** menos configuração, código sem endereços fixos, estados de carregamento honestos
  e a regra de data pedida protegida por teste.
- **Limitação conhecida:** o pacote JavaScript tem ~716 kB (Recharts é grande); o Vite avisa
  acima de 500 kB. Para uma POC local, aceitável.

## D43 — Funcionalidades da tela
- **Decisão:** o que a tela mostra e como o usuário interage.
- **Escolha:** seletores no topo (variável, modelo, horizonte de 1 a 14 dias, vindos de
  `/api/opcoes`) e 4 seções: (1) **previsão** — histórico + previsão tracejada + faixa de 95%,
  janela de 30 ou 90 dias, opção de comparar com o histórico da outra variável e tabela com os
  valores previstos; (2) **comparação dos modelos** — MAE, RMSE, cobertura, viés e % vs linha de
  base, destaque "menor erro" e clique para selecionar o modelo; (3) **previsão x real no teste**
  — ● dentro da faixa, ✕ fora; (4) **caso de estudo** — só antes x tudo x só depois, linha da
  mudança, faixa do teste, tabela por cenário e um texto "como ler".
- **Por quê:** cobre as 4 funcionalidades pedidas e reaproveita as convenções dos gráficos das
  etapas 2–5 (cores, ●/✕, tracejado), para o cliente reconhecer o que viu nos relatórios. A tabela
  de valores previstos garante leitura precisa sem depender só do gráfico.

## D44 — Atualização automática dos dados (sempre até ontem) _(usuário)_
- **Decisão:** os dados deixam de ser fixos (coletados em 26-11-2026) e passam a ir sempre até o
  dia anterior ao acesso — ex.: acessando no dia 30, os dados vão até o dia 29.
- **Opções consideradas:** (a) atualizar automaticamente no primeiro pedido do dia; (b) botão
  "Atualizar dados" na tela; (c) tarefa agendada do Windows rodando a coleta todo dia.
- **Escolha:** (a). Antes de cada pedido (`before_request` no `app.py`), a API compara o último dia
  dos dados com **ontem no fuso de Fortaleza** (`zoneinfo`, não o fuso do computador). Se faltar
  dia: baixa os 90 dias e os 3 anos de contexto, grava os dois CSVs e limpa o cache.
- **Cuidados:**
  - **Tudo ou nada:** baixa os dois conjuntos antes de gravar qualquer um — os 90 dias nunca
    ficam à frente do contexto.
  - **Gravação atômica:** `salvar_csv` escreve num `.tmp` e troca com `os.replace`; se algo falhar
    no meio, o CSV antigo continua inteiro.
  - **Falha no Open-Meteo:** segue com os dados antigos, informa em `/api/saude` (campo
    `atualizacao`) e só tenta de novo após 10 minutos (para não atrasar todos os pedidos).
  - **Dentro da fila de cálculos (D37):** dois pedidos simultâneos não baixam os dados duas vezes.
  - **Testes sem internet e sem tocar nos CSVs reais** (cópias em pasta temporária e coleta
    simulada); os testes da API "congelam o hoje" para nunca dispararem a atualização.
- **Por quê:** ninguém precisa lembrar de nada e o projeto não ganha infraestrutura nova. (b)
  depende de alguém clicar; (c) exige configurar algo fora do projeto.
- **Efeitos aceitos:** o primeiro acesso de cada dia retreina tudo (~10 s até o gráfico
  principal, ~1,5 min até o caso de estudo). O **caso de estudo muda com o tempo**: a data da
  mudança é recalculada todo dia; quando a mudança de outubro sair da janela de 90 dias (meados de
  janeiro/2027), o detector ainda apontará *alguma* data, mesmo sem mudança forte. Os números da
  documentação (diário, relatório) são um retrato de 26-11-2026.
- **Verificado de verdade:** removendo o último dia do CSV e reiniciando a API, ela baixou do
  Open-Meteo sozinha e o CSV voltou idêntico ao original.

## D45 — Frontend robusto: nunca tela branca _(usuário)_
- **Decisão:** como a tela se comporta enquanto carrega, quando a API está fora ou quando algo
  quebra.
- **Opções consideradas:** só textos "Carregando…" (como estava); esqueletos + limites de erro +
  carregamento sob demanda; bibliotecas prontas (ex.: `react-error-boundary`).
- **Escolha:**
  - **Limites de erro (error boundaries)** em três níveis: cada seção, a faixa de aviso e a página
    inteira. Se uma parte quebrar, só ela mostra um aviso com "Tentar de novo".
  - **Esqueletos (skeletons)** no formato do gráfico/tabela, com **contador de segundos** e uma
    dica de quanto costuma demorar.
  - **`React.lazy` + `Suspense`:** o código dos gráficos (Recharts) é baixado separado; enquanto
    chega, o `Suspense` mostra o esqueleto. Efeito colateral bom: o pacote principal caiu de
    716 kB para 270 kB (o aviso do Vite sumiu).
  - **Faixa de aviso no topo:** "conectando e conferindo se os dados estão em dia", "sem conexão
    com a API" (vermelho) ou "dados desatualizados" (amarelo), com "Tentar de novo".
  - **Mensagens claras:** um 502/503/504 do proxy do Vite vira "Não foi possível conectar à API.
    O backend está rodando na porta 5000?".
  - **Virada do dia:** `/api/saude` é reconsultada a cada 15 min e ao voltar para a aba; se o
    último dia mudou, todas as seções são recarregadas.
  - Limite de erro escrito à mão (uma classe pequena), sem biblioteca extra.
- **Por quê:** pedido do usuário. Testado no navegador: backend desligado (avisos em todas as
  seções, sem tela branca), recuperação com um clique e carregamento com contador.
- **Achado no teste:** uma resposta guardada da API antiga (sem o campo `atualizacao`) quebrou a
  faixa de aviso. O limite de erro geral segurou a página (sem tela branca), mas derrubou tudo.
  Correção: a faixa ficou defensiva e ganhou um limite de erro próprio.

## D46 — Tela em linguagem simples: textos gerados por regras _(usuário)_
- **Decisão:** como tornar a tela compreensível para quem não é técnico ("números soltos" na
  tabela confundiam).
- **Opções consideradas:** (a) textos gerados por **regras** a partir dos números da API (frases
  prontas preenchidas); (b) textos escritos por um **modelo de linguagem** (Gemma local, Gemini).
- **Escolha:** (a) agora; (b) registrada como melhoria futura no relatório final.
- **O que mudou na tela:**
  - Cartões de destaque: "Amanhã", "Em DD-MM-AAAA" e "Tendência" (estável, leve alta/queda,
    alta/queda).
  - Parágrafos "Resumo" e "Dá para confiar?" na previsão; um texto de conclusão na comparação dos
    modelos e no teste; "O que isso significa" no caso de estudo — todos com os números reais.
  - Linguagem simples: "erro médio" (MAE), "acertou a faixa em 9 de 10 dias" (cobertura),
    "18% melhor / 13% pior / empate / é a régua" (vs linha de base), "errou para baixo/cima".
  - Ícones **i** com explicação curta; RMSE, viés e configuração recolhidos em "detalhes técnicos";
    uma frase explicando o modelo escolhido no seletor.
- **Regras das frases** (em `frontend/src/textos.ts`, com testes):
  - Tendência = último dia previsto − último dado real: menos de 0,2 °C = "estável"; de 0,2 a
    0,5 °C = "leve alta/queda"; acima = "alta/queda".
  - Diferença com a regra simples abaixo de 3% = "empate"; diferença entre o melhor modelo e a
    regra simples abaixo de 0,05 °C = aviso "podem ser sorte".
  - **Temperaturas com 1 casa ("29,1 °C"); erros e variações com 2 casas ("0,38 °C")**, iguais às
    tabelas.
- **Por quê:** (a) é instantânea, gratuita e **sempre correta** — só afirma o que os números
  mostram. (b) escreve de forma mais natural, mas pode inventar, custa latência e, no caso do
  Gemini, envia os dados para fora.
- **Achados no teste da tela (corrigidos):** (1) o cartão dizia "Estável" e "+0,2 °C" ao mesmo
  tempo (a variação real era +0,16, arredondada) — por isso a regra das 2 casas; (2) o texto dizia
  "errou 0,4 °C" e a tabela "0,38 °C"; (3) o ícone **i** abria e fechava no mesmo clique; (4) o
  aviso do **i** era cortado pela tabela — passou a ser posicionado em relação à janela;
  (5) "acertou só 0 de 10 dias" virou "não acertou nenhum dos 10 dias".

## D47 — Chronos-2 como 5º modelo (evolução 11.2) _(usuário)_
- **Decisão:** qual versão do Chronos usar, como montar a faixa de 95% e como encaixá-lo no
  projeto.
- **Opções consideradas:**
  - **Chronos-2** (`amazon/chronos-2`, 119,5 milhões de parâmetros, ~456 MB): o mais novo;
    devolve 21 quantis (1%, 5%, 10%, ..., 90%, 95%, 99%) e não sorteia nada.
  - **Chronos-Bolt** (tiny/mini/small/base): menor e rápido, mas foi treinado só com quantis de
    10% a 90% — não daria uma faixa de 95% comparável à dos outros modelos (D10).
  - **Chronos-T5** (o original): faz sorteios (o resultado muda a cada rodada) e é mais lento.
- **Escolha:**
  - **Chronos-2, na CPU**, com PyTorch "+cpu" (~200 MB em vez de ~2 GB da versão com placa de
    vídeo). Bibliotecas: `torch==2.15.0+cpu` e `chronos-forecasting==2.3.2`, no
    `requirements.txt` com o repositório oficial do PyTorch (`--extra-index-url`).
  - **Previsão = mediana (quantil 50%); faixa = quantis de 2,5% e 97,5%.** Esses dois não estão
    entre os treinados; a própria biblioteca os calcula entre os vizinhos (1% e 5%; 95% e 99%).
    Níveis acima de 98% dão erro claro (pediriam quantis abaixo de 1%).
  - **Modelo carregado uma vez por processo** e guardado na memória: carregar leva ~1 s (~25 s
    na 1ª vez, com o download); prever 7 dias leva ~0,06 s.
  - **Entra pela interface comum (D27):** `prever("chronos", serie, horizonte, nivel)`; aparece
    sozinho na validação, no caso de estudo e na API.
  - **Testes com o modelo real** (sem simulação): o contrato comum + repetibilidade, faixa de 80%
    mais estreita que a de 95%, nível largo demais e horizonte longo (42 dias). O modelo é baixado
    uma vez para `~/.cache/huggingface`; depois os testes rodam sem internet.
- **Por quê:** é a versão mais precisa e a única das três que entrega a faixa de 95% sem sorteio,
  então dá para comparar com os outros 4 modelos nas mesmas métricas. Licença Apache 2.0
  (gratuita, permite uso comercial). Os dados não saem do computador: o modelo só recebe os
  números da série.
- **Achados do teste rápido (série real, 26-11-2026):** resultados idênticos em duas rodadas; a
  faixa é **assimétrica** (mais espaço abaixo da mediana do que acima), diferente das faixas
  simétricas do ETS e do SARIMA.
- **Na tela (regras de texto da D46, ajustadas):** empates no menor erro (mesmo valor com 2 casas)
  são citados juntos ("Prophet e Chronos-2 empataram..."); para o Chronos-2 as frases dizem "viu"
  em vez de "treinado"; e, quando um modelo erra o nível mas a faixa acerta mais da metade dos
  dias, o texto avisa que foi "só porque era larga".

## D48 — Card "Ranking geral" e largura da faixa como métrica oficial _(usuário)_
- **Decisão:** como mostrar na tela a comparação de **todos** os modelos nas **duas** variáveis
  juntas (antes, a tela só comparava os modelos numa variável por vez).
- **Opções consideradas:** (a) um card no topo, independente dos seletores, com o ranking
  calculado no frontend a partir de `/api/metricas` das duas variáveis; (b) uma rota nova na API
  que já devolvesse o ranking pronto; (c) só o ranking no relatório, sem mudar a tela.
- **Escolha:** (a).
  - **Critério do ranking** (o mesmo da seção 7.2 do relatório): posição em cada variável pelo
    erro médio (MAE; empate nas 2 casas → desempata o "vs regra simples", que vem do MAE sem
    arredondar); ranking geral pela **posição média**; empate → menor **erro médio** das duas.
  - **Largura da faixa (`largura_faixa`) virou métrica oficial** em `avaliacao.py`: a distância
    média entre o limite de cima e o de baixo, em °C. Aparece em `/api/metricas`, `/api/teste` e
    `/api/caso-estudo`.
  - Contas em `frontend/src/ranking.ts` (funções puras, testadas); frase em `textos.ts` (D46):
    quem é o mais regular, quem teve o menor erro somado e por que não é o 1º (venceu a regra
    simples em menos variáveis; faixa ≥ 1,5x mais larga), e quem mais oscilou (≥ 3 posições).
  - Médias de dois números de 2 casas arredondadas "como à mão" (0,335 → 0,34), para a tela
    mostrar o mesmo número que o relatório.
- **Por quê:** (a) reaproveita o que a API já calcula e guarda em cache (o card e a tabela por
  variável usam a mesma consulta); (b) duplicaria regra de apresentação no backend. A largura
  precisava ser oficial porque o ranking a usa para explicar por que o modelo de menor erro somado
  não é o 1º — e porque cobertura sem largura engana (achado da evolução 11.2).
- **Achado:** o JavaScript guarda 0,335 como 0,33499999…, e a tela mostrava "0,33" onde o
  relatório dizia "0,34". Corrigido com o arredondamento "como à mão".
