# Registro de decisões

Cada entrada segue o formato **Decisão / Opções consideradas / Escolha / Por quê** e descreve o
projeto **como ele é hoje** (atualizado em 27-11-2026).

- Decisões marcadas com _(cliente/usuário)_ vieram de um pedido; as demais foram propostas
  durante o projeto e aprovadas.
- **Os números não mudam:** o código e os outros documentos citam "D44", "D46" etc. Quando uma
  decisão deixa de valer, ela sai do texto e vai para a tabela
  [Decisões que não valem mais](#decisões-que-não-valem-mais), no fim.
- Como cada decisão evoluiu (versões antigas, números de antes) está no `docs/diario.md` e no
  histórico do Git.
- Próxima decisão: **D57**.

---

## 1. Dados

## D01 — Fonte dos dados _(cliente/usuário)_
- **Decisão:** de onde vêm os dados de temperatura.
- **Opções consideradas:** Open-Meteo; INMET (estações oficiais brasileiras); APIs pagas
  (OpenWeather, Visual Crossing).
- **Escolha:** API histórica do Open-Meteo. O parâmetro `past_days` da API de previsão fica como
  reserva para dias recentes que faltarem (D21).
- **Por quê:** gratuita, sem cadastro nem chave de API, devolve JSON pronto por dia e por fuso
  horário.

## D03 — Local e fuso horário _(cliente/usuário)_
- **Decisão:** ponto geográfico e fuso.
- **Opções consideradas:** coordenadas do centro de Fortaleza; de uma estação específica.
- **Escolha:** lat -3.72, lon -38.54, fuso `America/Fortaleza`.
- **Por quê:** o fuso define onde o "dia" começa e termina; com o fuso local, a média diária
  corresponde ao dia do calendário de Fortaleza (e não ao dia em UTC, 3 h adiantado).

## D04 — Período da série _(cliente/usuário)_
- **Decisão:** quantos dias de histórico usar.
- **Opções consideradas:** 30, 60 ou 90 dias (pedido do cliente: 1 a 3 meses); anos de histórico.
- **Escolha:** 90 dias, terminando ontem (D20).
- **Por quê:** é o máximo pedido pelo cliente; mais dados = estimativas mais estáveis, sem sair do
  escopo de "série pequena".

## D14 — Armazenamento: CSV
- **Decisão:** onde guardar os dados coletados.
- **Opções consideradas:** CSV; SQLite.
- **Escolha:** CSV em `backend/data/fortaleza_diario.csv` (colunas `data`, `temperatura_media`,
  `fonte`) e `backend/data/fortaleza_contexto_3anos.csv` (D24).
- **Por quê:** são ~90 linhas — um CSV abre no Excel, é lido direto pelo pandas e o Git mostra
  as mudanças linha a linha. SQLite só compensaria com consultas complexas ou muitos dados.

## D19 — Sem variáveis externas (umidade, vento, chuva)
- **Decisão:** usar outras variáveis do tempo como apoio para prever a temperatura.
- **Opções consideradas:** (a) prever só pelo próprio histórico; (b) SARIMAX/Prophet com as
  variáveis externas previstas pelos nossos próprios modelos; (c) usar a previsão dessas variáveis
  do Open-Meteo.
- **Escolha:** (a).
- **Por quê:** para usar a umidade de amanhã, seria preciso prevê-la antes — em (b) os erros se
  somam; em (c) o Open-Meteo já entrega a temperatura prevista pronta, e a POC viraria um repasse.
  Linha de base e ETS não aceitam variáveis externas (comparação desigual), e com 90 dias cada
  variável a mais aumenta o risco de decorar ruído. Fica como próximo passo para produção no
  relatório final.

## D20 — Último dia da série: ontem, não hoje
- **Decisão:** qual é o último dia dos 90 dias.
- **Opções consideradas:** incluir hoje; terminar ontem.
- **Escolha:** os 90 dias que terminam **ontem** (o último dia completo).
- **Por quê:** durante o dia, a "média de hoje" mistura horas já observadas com horas ainda
  previstas — seria um dado incompleto se passando por real. Hoje passa a ser o **primeiro dia
  previsto**.

## D21 — Modelo da API histórica: `best_match` (e `past_days` só como reserva)
- **Decisão:** qual modelo meteorológico pedir à API histórica.
- **Opções consideradas:** (a) `era5` puro (reanálise, ~6 dias de atraso) + `past_days` para os
  dias faltantes; (b) `best_match` (o Open-Meteo escolhe o melhor modelo para o local), com
  `past_days` só como reserva.
- **Escolha:** (b).
- **Por quê:** medido em 25-11-2026: o `best_match` veio completo até ontem e é **idêntico** à API
  de previsão nos 30 dias em comum (mesma fonte, sem emenda). O `era5` puro termina 6 dias antes e
  é **~0,6 °C mais frio** (a célula de ~25 km inclui parte do oceano). Com (a), os últimos dias
  viriam de outra fonte, mais quente: um **salto artificial** que o modelo confundiria com mudança
  real. O `past_days=30` continua no código: preenche buracos se a API histórica atrasar (a coluna
  `fonte` mostra a origem de cada dia).

## D23 — Manter 90 dias diários de Fortaleza, apesar da pouca variação
- **Decisão:** a pouca variação da série (desvio-padrão de 0,5 °C) atrapalha a POC?
- **Opções consideradas:** (a) manter; (b) dados horários; (c) outra cidade com mais variação;
  (d) histórico maior (6 meses a 3 anos).
- **Escolha:** (a).
- **Por quê:**
  - O que torna uma série previsível não é variar muito, e sim ter **padrão**: a correlação de um
    dia com o seguinte é 0,75 — a série tem memória.
  - (b) muda o problema (prever horas, não médias diárias) e o ciclo dia/noite infla a
    "precisão"; (c) foge do pedido do cliente.
  - (d) Fortaleza tem ciclo anual de ~2 °C: com menos de 2 anos o modelo misturaria estações sem
    ver o padrão repetir. Com 2–3 anos o projeto mudaria — fica como próximo passo no relatório.
  - Consequência aceita: erros pequenos em °C, linha de base difícil de bater, e diferenças
    pequenas entre modelos em 10 dias de teste podem ser sorte.

## D24 — Contexto de 3 anos: só para entender, nunca para treinar
- **Decisão:** como usar dados mais antigos sem mudar o escopo de 90 dias.
- **Opções consideradas:** não usar; série contínua de 3 anos; o mesmo período do calendário em
  cada ano, sobreposto; treinar com eles.
- **Escolha:** `backend/data/fortaleza_contexto_3anos.csv` (mesma fonte `best_match`) só para
  gráficos e comparação. Os modelos treinam só com os 90 dias. **Normal** (climatologia) = média
  dos anos anteriores no mesmo dia, suavizada com média móvel centrada de 7 dias. **Anomalia** =
  valor de agora − normal.
- **Por quê:** separa o que é **estação** (todos os anos sobem de agosto a novembro) do que é
  **anomalia** (2026 acima dos outros anos). A ideia do período sobreposto veio do usuário.

## D44 — Atualização automática dos dados (sempre até ontem) _(usuário)_
- **Decisão:** os dados vão sempre até o dia anterior ao acesso (acessando no dia 30, vão até o 29).
- **Opções consideradas:** (a) atualizar automaticamente no primeiro pedido do dia; (b) botão
  "Atualizar dados" na tela; (c) tarefa agendada do Windows.
- **Escolha:** (a). Antes de cada pedido (`before_request` no `app.py`), a API compara o último dia
  dos dados com **ontem no fuso de Fortaleza** (`zoneinfo`). Se faltar dia: baixa os 90 dias e o
  contexto, grava os dois CSVs e limpa o cache.
- **Cuidados:**
  - **Tudo ou nada:** baixa os dois conjuntos antes de gravar qualquer um.
  - **Gravação atômica:** `salvar_csv` escreve num `.tmp` e troca com `os.replace`.
  - **Falha no Open-Meteo:** segue com os dados antigos, avisa em `/api/saude` (campo
    `atualizacao`) e só tenta de novo após 10 minutos.
  - **Dentro da fila de cálculos (D37):** dois pedidos simultâneos não baixam os dados duas vezes.
  - **Testes nunca tocam nos CSVs reais** nem dependem do dia: usam cópias temporárias, coleta
    simulada e "congelam o hoje" (`servico.hoje_em_fortaleza`).
- **Por quê:** ninguém precisa lembrar de nada e o projeto não ganha infraestrutura nova.
- **Efeitos aceitos:** o primeiro acesso de cada dia retreina tudo. O **caso de estudo muda com o
  tempo**: a data da mudança é recalculada todo dia; quando a mudança de outubro sair da janela
  (meados de janeiro/2027), o detector ainda apontará *alguma* data. Os números da documentação
  são um retrato de 26-11-2026.

## D52 — Uma série só: a temperatura média _(usuário)_
- **Decisão:** quantas séries prever. A POC começou com duas (temperatura e sensação térmica).
- **Opções consideradas:** (a) manter as duas; (b) só a temperatura, mas com um parâmetro
  `variavel` de um valor só na API; (c) só a temperatura, sem o parâmetro.
- **Escolha:** (c) — só a temperatura média diária (`temperature_2m_mean`; no código,
  `coleta.COLUNA = "temperatura_media"`). Não reintroduzir a sensação sem pedido do usuário.
- **Por quê:** a sensação dobrava quase tudo (combinações, seletores, tabelas do relatório), tinha
  o mesmo comportamento da temperatura e não trazia lição nova. Um parâmetro com um único valor
  possível é complexidade sem uso; o código atual já serve de modelo para pôr outra série quando
  houver uma métrica real do cliente (relatório, seção 11.4).
- **Consequência:** a recomendação passou a ser o **Chronos-2** (ver D47).

---

## 2. Modelagem e avaliação

## D05 — Horizonte de previsão _(cliente/usuário)_
- **Decisão:** quantos dias à frente prever.
- **Opções consideradas:** 3, 7 ou 14 dias.
- **Escolha:** 7 dias (a tela aceita de 1 a 14 — D38).
- **Por quê:** uma semana é útil para o cliente e ainda curto o bastante para um modelo treinado
  com 90 dias. Quanto mais longe, maior a incerteza.

## D06 — Estratégia de validação _(cliente/usuário)_
- **Decisão:** como medir se o modelo acerta.
- **Opções consideradas:** separar o final da série como teste (*holdout*); validação cruzada em
  janelas deslizantes (*rolling origin*).
- **Escolha:** os últimos 10 dias como teste; treino com os 80 anteriores. Na previsão final o
  modelo é retreinado com os 90 dias.
- **Por quê:** em séries temporais não se embaralham os dados — o teste precisa ser o "futuro" do
  treino. O holdout simples é fácil de explicar ao cliente. Limite: 10 dias é pouco; repetir a
  comparação em várias semanas está nos próximos passos.

## D07 — Modelos comparados _(cliente/usuário)_
- **Decisão:** quais modelos treinar.
- **Opções consideradas:** linha de base ingênua; ETS/Holt-Winters; SARIMA; Prophet; modelos de
  machine learning ou redes neurais treinados do zero; modelo fundacional pré-treinado.
- **Escolha:** (1) **linha de base** = média dos últimos 7 dias; (2) **ETS** e (3) **SARIMA**
  (statsmodels); (4) **Prophet**, só como comparação; (5) **Chronos-2** (D47).
- **Por quê:** a linha de base é a régua — um modelo só vale se superá-la. ETS e SARIMA são os
  clássicos para séries curtas. O Prophet foi pensado para séries longas; incluí-lo mostra o que
  acontece quando a ferramenta não combina com o problema. ML/redes treinados do zero precisam de
  muito mais que 90 pontos (não propor — decisão do usuário); o Chronos-2 contorna isso porque já
  vem treinado.

## D08 — Métricas _(cliente/usuário)_
- **Decisão:** como comparar os modelos.
- **Opções consideradas:** MAE, RMSE, MAPE, cobertura do intervalo.
- **Escolha:** MAE, RMSE e cobertura do intervalo (% de dias reais dentro da faixa prevista).
  Auxiliares em D34 e D48.
- **Por quê:** MAE e RMSE ficam em °C (fáceis de explicar); RMSE pune mais os erros grandes. A
  cobertura avalia se a faixa de incerteza é honesta. MAPE foi descartado: em temperatura,
  percentual não tem significado intuitivo.

## D10 — Tamanho do intervalo de confiança
- **Decisão:** largura da faixa de incerteza.
- **Opções consideradas:** 80% ou 95%.
- **Escolha:** 95% (`modelos.NIVEL`).
- **Por quê:** é o padrão das bibliotecas (statsmodels usa `alpha=0.05`) e fica comparável entre
  os modelos. Limite: com 10 dias de teste, a cobertura só varia de 10 em 10 pontos percentuais.

## D25 — Padrões dos gráficos
- **Decisão:** cores e formato dos gráficos (Python e tela).
- **Opções consideradas:** cores padrão do matplotlib; paleta fixa.
- **Escolha:** temperatura sempre **azul** (`#2a78d6`); nunca dois eixos verticais no mesmo
  gráfico; na comparação entre anos, anos anteriores em cinza e só o ano atual colorido.
- **Por quê:** a mesma cor para a mesma coisa em todos os gráficos evita confusão. Dois eixos
  verticais com escalas diferentes enganam a leitura.

## D26 — Detecção do ponto de mudança
- **Decisão:** como achar a data da "mudança forte" para o caso de estudo.
- **Opções consideradas:** só olhar o gráfico; biblioteca `ruptures`; método próprio simples.
- **Escolha:** método próprio (`exploracao.detectar_mudanca`): testa cada data de corte e escolhe
  a que melhor divide a série em dois trechos com médias diferentes (menor soma dos quadrados dos
  desvios), com no mínimo 10 dias de cada lado. Aplicado à **anomalia** (D24), não à série bruta.
- **Por quê:** ~10 linhas que dá para entender inteiras, sem dependência nova. Na série bruta o
  método confunde a subida da estação com mudança; na anomalia, a estação já foi descontada.
  Resultado em 26-11-2026: **15-10-2026** (anomalia de +0,49 para +0,86 °C).

## D27 — Interface comum dos modelos
- **Decisão:** como organizar os modelos no código.
- **Opções consideradas:** uma classe por modelo com herança; uma função por modelo com a mesma
  assinatura; código separado em cada script.
- **Escolha:** uma função por modelo (`prever_linha_base`, `prever_ets`, `prever_sarima`,
  `prever_prophet`, `prever_chronos`), todas `(serie, horizonte, nivel) -> Previsao`, registradas
  no dicionário `MODELOS` e acessadas por `modelos.prever(nome, ...)`. `Previsao` tem a `tabela`
  (previsao, inferior, superior por data) e os `detalhes` (o que o modelo escolheu).
- **Por quê:** funções são mais simples de ler que classes; a assinatura única permite que a
  avaliação, o caso de estudo e a API tratem todos os modelos igual. Um teste de "contrato" garante
  que todos devolvem a mesma estrutura.

## D28 — Escolha da configuração por AICc, refeita a cada treino
- **Decisão:** como escolher a configuração do ETS e do SARIMA.
- **Opções consideradas:** fixar à mão; testar várias e escolher por AIC, AICc ou BIC; escolher
  pelo erro no período de teste.
- **Escolha:** testar candidatos e ficar com o **menor AICc**. A busca faz parte do modelo e roda
  sobre os dados que ele recebe (na validação, só os 80 dias de treino).
- **Por quê:** o AICc equilibra ajuste e simplicidade e corrige o AIC para séries curtas. Escolher
  pelo erro no teste seria "espiar a prova".

## D29 — Faixa da linha de base pelos erros passados
- **Decisão:** como dar uma faixa de incerteza à regra "média dos últimos 7 dias", que não tem
  fórmula estatística.
- **Opções consideradas:** desvio-padrão da série; desvio dos erros de 1 dia para todos os
  horizontes; desvio dos erros passados **para cada distância**.
- **Escolha:** para cada distância h, aplica a regra em todos os dias do passado, mede o erro h
  dias depois e usa ±1,96 × desvio-padrão desses erros.
- **Por quê:** é honesto (mostra quanto a própria regra errou) e a faixa cresce com a distância.
  Limite: supõe erros simétricos e parecidos com os do passado.

## D36 — Linha de base com horizonte longo (complemento da D29)
- **Decisão:** o que fazer quando o horizonte é maior que o histórico disponível para medir o erro
  (caso de estudo: o "só antes" prevê ~42 dias com ~48 de treino).
- **Opções consideradas:** recusar horizontes longos; extrapolar o crescimento do erro; repetir o
  desvio da maior distância mensurável.
- **Escolha:** exigir pelo menos 10 exemplos de erro por distância (`MIN_EXEMPLOS_ERRO`); acima da
  maior distância mensurável, repetir o desvio dela. Série curta demais (< 17 dias) → erro claro.
- **Por quê:** simples e sem inventar dados. Limite: nesses casos a faixa para de crescer e tende a
  ficar estreita demais.

## D30 — ETS: `ETSModel`, erro aditivo, 3 candidatos sem sazonalidade
- **Decisão:** qual implementação e quais configurações do ETS.
- **Opções consideradas:** `ExponentialSmoothing` (Holt-Winters clássico) ou `ETSModel`; com/sem
  tendência, amortecida, sazonalidade de 7 dias.
- **Escolha:** `ETSModel` com erro aditivo; candidatos: sem tendência, tendência, tendência
  amortecida; nenhum com sazonalidade.
- **Por quê:** o `ETSModel` calcula intervalos de previsão (o `ExponentialSmoothing` não). A
  exploração não achou padrão semanal, então sazonalidade só acrescentaria parâmetros.

## D31 — SARIMA: 72 candidatos (p, q, parte sazonal, tendência)
- **Decisão:** quais combinações do SARIMA testar.
- **Opções consideradas:** fixar ARIMA(1,1,0); busca ampla (p, q até 5); busca moderada;
  biblioteca `pmdarima` (`auto_arima`).
- **Escolha:** busca própria e moderada: p e q de 0 a 2; parte sazonal de 7 dias (P, Q de 0 a 1)
  **como candidata**; com/sem tendência — 72 combinações. O d vem antes, por teste (D33).
- **Por quê:** com 90 pontos, ordens altas só decoram ruído. A sazonalidade semanal como candidata
  deixa os dados confirmarem que ela não ajuda. Busca própria = código visível e sem dependência
  nova.

## D33 — SARIMA: d escolhido pelo teste ADF com tendência
- **Decisão:** quantas diferenciações (d) usar no SARIMA.
- **Opções consideradas:** (a) d fixo; (b) deixar o AICc escolher d; (c) escolher d por teste
  estatístico e o resto por AICc (método do `auto.arima`).
- **Escolha:** (c) — ADF com tendência (`regression="ct"`) na série de treino: p < 0,05 → d = 0
  com tendência linear; senão d = 1 com drift opcional.
- **Por quê:** a série não é estacionária em torno de um nível fixo, mas pode ser em torno de uma
  tendência — um ADF sem tendência leva a diferenciar demais (sinal: termo MA perto de −1). Na
  temperatura o teste fica inconclusivo (p ≈ 0,17) e o d fica 1; com 90 pontos o teste tem pouca
  força. (b) não funciona: AICc de modelos com d diferente não é comparável.

## D32 — Prophet sem sazonalidades
- **Decisão:** configuração do Prophet.
- **Opções consideradas:** padrão (sazonalidades anual e semanal automáticas); tudo desligado.
- **Escolha:** sazonalidades anual, semanal e diária desligadas; `interval_width=0.95`; semente
  fixa (`np.random.seed(0)`) antes de prever.
- **Por quê:** 90 dias não contêm um ano (a sazonalidade anual seria inventada) e não há padrão
  semanal. Sobra a tendência linear por partes. A semente fixa torna o intervalo (feito por
  simulação) reproduzível.

## D47 — Chronos-2 como 5º modelo, e o recomendado _(usuário)_
- **Decisão:** qual versão do Chronos usar, como montar a faixa de 95% e qual modelo recomendar.
- **Opções consideradas:**
  - **Chronos-2** (`amazon/chronos-2`, ~456 MB): o mais novo; devolve 21 quantis e não sorteia.
  - **Chronos-Bolt:** menor, mas só tem quantis de 10% a 90% — não daria uma faixa de 95%.
  - **Chronos-T5** (o original): faz sorteios (resultado muda a cada rodada) e é mais lento.
- **Escolha:**
  - **Chronos-2 na CPU**, com PyTorch "+cpu" (~200 MB em vez de ~2 GB). `torch==2.15.0+cpu` e
    `chronos-forecasting==2.3.2` no `requirements.txt` (`--extra-index-url` do PyTorch).
  - **Previsão = mediana; faixa = quantis de 2,5% e 97,5%** (a biblioteca interpola entre 1%/5% e
    95%/99%). Níveis acima de 98% dão erro claro.
  - **Zero-shot:** não é treinado com os nossos dados, só "vê" o histórico. Carregado uma vez por
    processo (D51).
  - Entra pela interface comum (D27); testes usam o modelo real.
  - **Recomendado e padrão** (`MODELO_PADRAO = "chronos"` na API e modelo inicial da tela).
- **Por quê:** é a única versão que entrega a faixa de 95% sem sorteio, comparável aos outros.
  Licença Apache 2.0; os dados não saem do computador. Na recomendação: foi o único entre os
  melhores nos dois testes feitos (16–25/11: 0,31 °C, empatado com o Prophet; 17–26/11: 0,38 °C, o
  melhor). O Prophet só acerta enquanto a tendência continua; o SARIMA ficou pior que a regra
  simples no segundo teste.
- **Custo:** a faixa é ~2x mais larga que a do SARIMA e é **assimétrica**. Dois testes de 10 dias
  ainda são pouco: antes de fixar em produção, repetir a comparação em várias semanas.

## D51 — Chronos-2 sem internet e com versão fixa _(usuário)_
- **Decisão:** como carregar o Chronos-2 para funcionar sem internet sem espera e sem mudar de
  versão sozinho.
- **Contexto:** sem internet, a carga levava **56 s** (o Hugging Face tentava a rede 5 vezes antes
  de usar o cache), e a cada carga ele podia trocar de versão sem aviso.
- **Opções consideradas:** (a) `HF_HUB_OFFLINE=1` no ambiente; (b) `local_files_only=True` no
  `from_pretrained` (não basta: o Chronos não repassa a opção); (c) pedir a **pasta local** do
  modelo, numa **versão fixa**, e carregar a partir dela.
- **Escolha:** (c). `CHRONOS_VERSAO` = commit `29ec3766…` do `amazon/chronos-2`.
  `_pasta_do_chronos()` tenta o cache sem rede; se não houver, baixa essa versão. A versão aparece
  nos detalhes da previsão.
- **Por quê:** sem internet carrega em ~12 s, sem tentativa de rede (há teste), e os números só
  mudam quando alguém troca a versão de propósito.
- **Custo:** atualizar o modelo é manual: trocar `CHRONOS_VERSAO`, rodar os testes e refazer a
  validação e o caso de estudo.

## D34 — Métricas auxiliares e forma de ler a validação
- **Decisão:** além de MAE, RMSE e cobertura (D08), o que mostrar para interpretar o teste.
- **Opções consideradas:** só as 3 métricas; métricas extras; teste estatístico de diferença entre
  modelos (ex.: Diebold-Mariano).
- **Escolha:** MAE nos dias 1–7 (horizonte do produto), viés (erro médio com sinal) e MAE relativo
  à linha de base (%); erro dia a dia; no gráfico, real dentro da faixa = ●, fora = ✕. Sem teste
  estatístico formal. Um teste automático garante que o modelo nunca vê o período de teste
  (alterar esses valores não muda a previsão).
- **Por quê:** o teste tem 10 dias, mas o produto prevê 7; o MAE relativo responde "vale a pena
  trocar a regra simples?"; o erro dia a dia mostra se um único dia decide o ranking. Com 10 dias,
  um teste formal teria pouco poder.

## D48 — Largura da faixa como métrica oficial _(usuário)_
- **Decisão:** medir a largura da faixa de incerteza junto com a cobertura.
- **Opções consideradas:** só a cobertura; cobertura + largura.
- **Escolha:** `largura_faixa` em `avaliacao.py` = distância média entre o limite de cima e o de
  baixo, em °C. Aparece em `/api/metricas`, `/api/teste` e `/api/caso-estudo` e nos detalhes da
  tabela "Comparação dos modelos".
- **Por quê:** cobertura sem largura engana: uma faixa muito larga "acerta" quase todos os dias sem
  dizer nada (achado com o Chronos-2).

## D35 — Desenho do caso de estudo (quebra estrutural) _(cliente/usuário)_
- **Decisão:** como estudar o efeito da mudança forte recente de temperatura.
- **Opções consideradas:** (a) cada cenário avaliado numa janela diferente; (b) todos avaliados na
  **mesma janela de teste**, cada um prevendo do fim do seu treino até o fim do teste;
  (c) reaproveitar parâmetros aprendidos "antes" sem reaprender. Incluir ou não "só depois".
- **Escolha:** (b), com a data da D26, os 5 modelos e **três** cenários: só antes, tudo e só
  depois (`caso_estudo.avaliar_cenarios`).
- **Por quê:** a mesma janela torna os números comparáveis com a validação. Ressalva: o "só antes"
  prevê de mais longe (~42 dias); para linha de base e ETS isso não muda a previsão (reta
  horizontal), só a faixa. O "só depois" responde "vale descartar o passado?". Conclusão: modelos
  que não viram a mudança erram 2–3,4x mais e para o mesmo lado — retreinar com frequência.

---

## 3. Código e ferramentas

## D11 — Versão do Python
- **Decisão:** qual Python usar no backend.
- **Opções consideradas:** Python 3.15 (já instalado); Python 3.12.
- **Escolha:** Python 3.12, com venv em `backend/.venv`.
- **Por quê:** bibliotecas científicas (prophet/cmdstanpy, statsmodels, torch) podem não ter
  pacotes prontos para o 3.15, e compilar no Windows costuma falhar. O 3.12 é estável e suportado
  por todas.

## D15 — Estrutura: monorepo com pacote `previsao/` separado do Flask
- **Decisão:** como organizar o código.
- **Opções consideradas:** tudo no `app.py`; lógica num pacote separado e o Flask só "embalando".
- **Escolha:** monorepo (`/backend`, `/frontend`, `/docs`). No backend, o pacote `previsao/`
  (coleta, exploração, modelos, avaliação, caso de estudo, serviço) é independente da web;
  `app.py` só chama suas funções.
- **Por quê:** dá para testar e rodar os modelos sem subir servidor, e a API fica fina e simples.

## D16 — Scripts `.py` em vez de notebooks Jupyter
- **Decisão:** formato das etapas de análise (coleta → caso de estudo).
- **Opções consideradas:** notebooks Jupyter; scripts Python.
- **Escolha:** um script por etapa em `backend/scripts/`, salvando gráficos em `docs/img/`
  (matplotlib).
- **Por quê:** diff limpo no Git, verificação pelo ruff e o mesmo código reaproveitado pela API.

## D17 — Gestão de dependências
- **Decisão:** como declarar as bibliotecas.
- **Opções consideradas:** `requirements.txt`; `pyproject.toml` com dependências; Poetry/uv.
- **Escolha:** `requirements.txt` com versões fixadas (`==`); `pyproject.toml` só para configurar
  ruff e pytest. No frontend, `package.json` + `package-lock.json`.
- **Por quê:** `pip install -r requirements.txt` é o caminho mais conhecido; versões fixadas
  garantem que todos tenham o mesmo ambiente.

## D18 — Regras de qualidade
- **Decisão:** quais verificações rodar no código.
- **Opções consideradas:** só as regras padrão; conjunto ampliado.
- **Escolha:** backend: ruff com `E`, `F`, `I`, `B`, `UP`, linha de até 100 caracteres, `ruff
  format`; pytest (inclui um teste de ambiente que treina um Prophet minúsculo). Frontend: Vitest,
  `tsc` e oxlint.
- **Por quê:** pega erros reais sem virar burocracia. O teste do Prophet existe porque é a
  instalação mais frágil no Windows (depende do CmdStan compilado).

## D22 — Testes sem internet
- **Decisão:** como testar o código que chama o Open-Meteo.
- **Opções consideradas:** chamar a API de verdade; respostas falsas montadas à mão.
- **Escolha:** respostas falsas no formato do Open-Meteo; a chamada real fica no script da etapa.
  (Exceção: o Chronos-2 usa o modelo real, baixado uma vez para o cache — D51.)
- **Por quê:** testes que dependem da internet falham por motivos alheios ao código. Com dados
  falsos, testamos sempre do mesmo jeito os casos difíceis (null, buraco, duplicata, prioridade
  entre fontes).

---

## 4. API (Flask)

## D12 — Backend: Flask + Flask-CORS _(cliente/usuário)_
- **Decisão:** framework da API.
- **Opções consideradas:** Flask; FastAPI; Django REST Framework.
- **Escolha:** Flask com Flask-CORS.
- **Por quê:** mínimo e fácil de entender para quem está aprendendo.

## D37 — Quando calcular: sob demanda, com cache e fila única
- **Decisão:** em que momento a API treina os modelos.
- **Opções consideradas:** (a) treinar tudo quando o servidor inicia; (b) calcular no primeiro
  pedido e guardar na memória; (c) script que pré-calcula arquivos JSON.
- **Escolha:** (b), com `_calculo_unico` em `servico.py`: cada resultado é calculado no primeiro
  pedido e guardado; cálculos novos rodam numa **fila única** (`threading.RLock`, reentrante
  porque um cálculo pode chamar outro), um de cada vez; os já feitos respondem na hora. Cálculos
  leves (`/api/contexto`) têm trava própria (`_calculo_leve`) para não esperar na fila dos modelos.
- **Por quê:** (a) faria cada início levar minutos; (c) cria arquivos que ficam velhos. A fila
  existe por causa do **GIL** do Python (threads não executam código Python de verdade em
  paralelo): rodando os 4 pedidos pesados da tela ao mesmo tempo, todos ficavam lentos (95 s para
  carregar tudo) e a mesma validação era calculada duas vezes. Em fila, o gráfico principal fica
  pronto primeiro e cada cálculo roda uma única vez (há teste).

## D38 — Formato da API: rotas, parâmetros e respostas
- **Decisão:** como expor os resultados.
- **Opções consideradas:** uma rota única com tudo; uma rota por parte da tela; GET x POST.
- **Escolha:** 7 rotas `GET` em `/api`: `saude`, `opcoes`, `previsao`, `metricas`, `teste`,
  `caso-estudo` e `contexto`. Parâmetros na URL só onde a resposta depende deles: `modelo`
  (padrão `chronos`) em `previsao` e `teste`; `horizonte` (1–14, padrão 7) em `previsao`. Datas
  `AAAA-MM-DD`, números com 2 casas, `null` no lugar de NaN. `/api/previsao` devolve histórico +
  previsão juntos (não há rota só de histórico — D54).
- **Por quê:** cada rota corresponde a uma parte da tela. GET porque nada é alterado — e respostas
  GET podem ficar em cache no TanStack Query. `/api/opcoes` evita repetir a lista de modelos no
  frontend. Horizonte até 14 dias: além disso, com 90 dias de treino, a previsão vira uma reta sem
  sentido. Detalhes em `docs/api.md`.

## D39 — CORS só para o frontend de desenvolvimento
- **Decisão:** quais sites podem chamar a API pelo navegador.
- **Opções consideradas:** qualquer origem (`*`); só o frontend.
- **Escolha:** Flask-CORS liberando só `http://localhost:5173` e `http://127.0.0.1:5173`, nas
  rotas `/api/*` (`ORIGENS_PERMITIDAS` no `app.py`). A tela usa o proxy do Vite (D42).
- **Por quê:** `*` deixaria qualquer página aberta no navegador consultar a API local. Para outro
  endereço (ex.: produção), basta acrescentá-lo em `ORIGENS_PERMITIDAS`.

## D40 — Erros sempre em JSON, em português, sem vazar detalhes internos
- **Decisão:** como a API responde quando algo dá errado.
- **Opções consideradas:** páginas HTML padrão do Flask (em inglês); JSON padronizado.
- **Escolha:** JSON com `erro` (mensagem em português) e `parametro`/`valores_aceitos` (400) ou
  `status` (404, 405, 500). Erro 500 devolve mensagem genérica; o detalhe vai só para o terminal.
- **Por quê:** o frontend consegue mostrar a mensagem; a lista de valores aceitos ajuda a corrigir
  o pedido. Esconder detalhes do erro 500 evita expor caminhos e código do servidor.

## D50 — Comparação com os anos anteriores: rota `/api/contexto` _(usuário)_
- **Decisão:** como mostrar na tela a comparação do período atual com o mesmo período dos anos
  anteriores.
- **Opções consideradas:** (a) imagens prontas dos scripts; (b) rota que calcula na hora com as
  funções da exploração.
- **Escolha:** (b) — `GET /api/contexto`, sem parâmetros: média e subida no período por ano,
  anomalia média e recente, o degrau (mesma detecção do caso de estudo, D26) e a série diária com
  os anos sobrepostos e o "normal". Reaproveita `mesmo_periodo_por_ano`, `climatologia`,
  `anomalia` e `detectar_mudanca`.
- **Por quê:** imagens congelariam os números, e os dados mudam todo dia (D44); a rota mantém tela
  e relatório com os mesmos cálculos.
- **Limite:** são **2 anos anteriores** (2024 e 2025): o arquivo de contexto começa em 26-11-2023.

## D54 — Sem rota só de histórico (`/api/serie` removida) _(usuário)_
- **Decisão:** ter ou não uma rota que devolve só o histórico de 90 dias.
- **Opções consideradas:** (a) manter "para consultas diretas"; (b) não ter.
- **Escolha:** (b). A tela nunca usou: `/api/previsao` já devolve o `historico`.
- **Por quê:** uma rota sem uso é código, teste e documentação para manter sem benefício.

## D55 — A tela decide o modelo inicial (sem `padroes` em `/api/opcoes`) _(usuário)_
- **Decisão:** quem define o modelo e o horizonte iniciais da tela.
- **Opções consideradas:** (a) a tela ler um campo `padroes` de `/api/opcoes` (e esperar a API
  para montar o estado); (b) a tela fixar os valores (`chronos`, 7) em `App.tsx`.
- **Escolha:** (b). Sem `modelo` na URL, a API continua usando `MODELO_PADRAO = "chronos"`.
- **Por quê:** a tela precisa dos valores antes de a API responder; um campo que ninguém lê dá a
  impressão errada de que muda algo.

---

## 5. Tela (frontend)

## D13 — Frontend: React + Vite + TypeScript, Recharts, TanStack Query, Tailwind _(cliente/usuário)_
- **Decisão:** tecnologias da tela.
- **Opções consideradas:** dashboards prontos em Python (Streamlit, Dash); SPA em React.
- **Escolha:** React + Vite + TypeScript; Recharts (gráficos); TanStack Query (consumo da API com
  cache e estados de carregamento); Tailwind (estilo).
- **Por quê:** é a stack definida para a ferramenta web; Recharts permite linha tracejada e área
  sombreada para o intervalo.

## D41 — Datas exibidas em DD-MM-AAAA (e números no padrão brasileiro) _(usuário)_
- **Decisão:** formato das datas que aparecem na ferramenta.
- **Opções consideradas:** (a) a API devolver `DD-MM-AAAA`; (b) a API continua em `AAAA-MM-DD` e
  o frontend converte só na exibição.
- **Escolha:** (b). Toda data exibida passa por `formatarData` (`frontend/src/formatacao.ts`),
  coberta por testes. Números com vírgula decimal e "°C" (`29,10 °C`), via
  `Intl.NumberFormat('pt-BR')`.
- **Por quê:** `AAAA-MM-DD` é o formato para máquinas (ordena certo como texto); `DD-MM-AAAA` é
  para pessoas. A conversão é feita no texto, **sem** `new Date()`: no fuso de Fortaleza,
  `new Date("2027-01-01")` vira 31/12/2026 às 21h — o dia errado (há teste).
- Os gráficos PNG da documentação (gerados em Python) usam `DD/MM` nos eixos.

## D42 — Frontend: organização e comportamento
- **Decisão:** como montar a tela com a stack definida.
- **Opções consideradas:** URL da API fixa no código x proxy do Vite; manter o gráfico anterior
  enquanto o novo carrega (`placeholderData`) x mostrar "Calculando…".
- **Escolha:**
  - **Proxy do Vite** (`/api` → `http://127.0.0.1:5000`): o código chama `/api/...` sem URL fixa.
  - **TanStack Query** com `staleTime: Infinity` (os dados só mudam quando o servidor atualiza o
    dia — aí a tela recarrega tudo, D45). Voltar a uma combinação já vista é instantâneo.
  - **Sem `placeholderData`:** manter o gráfico antigo sob o título novo confundia.
  - **Tailwind v4** com as cores do projeto (D25) como variáveis de tema; eixos, cores e
    formatação centralizados (`componentes/eixos.ts`, `cores.ts`, `formatacao.ts`).
  - Tipos das respostas em `api.ts`, espelhando `docs/api.md`, **sem campos opcionais "para API
    antiga"**: frontend e backend estão no mesmo repositório e mudam juntos (D56).
- **Por quê:** menos configuração, código sem endereços fixos e estados de carregamento honestos.

## D43 — Funcionalidades da tela
- **Decisão:** o que a tela mostra e como o usuário interage.
- **Escolha:** seletores no topo (modelo e horizonte de 1 a 14 dias; a lista vem de
  `/api/opcoes`; ao lado, uma frase sobre o modelo escolhido) e 5 cards:
  1. **Previsão** — cartões de destaque, histórico + previsão tracejada + faixa de 95%, janela de
     30 ou 90 dias e tabela com os valores previstos;
  2. **Comparação dos modelos** — erro médio, acertos da faixa e "vs regra simples"; clicar num
     modelo seleciona;
  3. **Previsão x real no teste** — ● dentro da faixa, ✕ fora;
  4. **Comparação com os anos anteriores** (D50);
  5. **Caso de estudo** (D53).
- **Por quê:** cobre o pedido (histórico + previsão + incerteza, comparação e caso de estudo) e
  reaproveita as convenções dos gráficos das etapas (cores, ●/✕, tracejado).

## D45 — Frontend robusto: nunca tela branca _(usuário)_
- **Decisão:** como a tela se comporta enquanto carrega, quando a API está fora ou quando algo
  quebra.
- **Opções consideradas:** só textos "Carregando…"; esqueletos + limites de erro + carregamento sob
  demanda; bibliotecas prontas (ex.: `react-error-boundary`).
- **Escolha:**
  - **Limites de erro** em três níveis: cada seção, a faixa de aviso e a página inteira. Se uma
    parte quebrar, só ela mostra um aviso com "Tentar de novo". Escrito à mão (uma classe pequena).
  - **Esqueletos** no formato do gráfico/tabela, com **contador de segundos** e dica de quanto
    costuma demorar.
  - **`React.lazy` + `Suspense`** nos gráficos (Recharts vem num pacote separado).
  - **Faixa de aviso no topo:** "conectando", "sem conexão com a API" (vermelho) ou "dados
    desatualizados" (amarelo).
  - **Mensagem clara** quando o proxy não alcança o backend (502/503/504): "O backend está rodando
    na porta 5000?".
  - **Virada do dia:** `/api/saude` é reconsultada a cada 15 min e ao voltar para a aba; se o
    último dia mudou, todas as seções são recarregadas.
- **Por quê:** pedido do usuário. Testado com o backend desligado: avisos em todas as seções, sem
  tela branca, e recuperação com um clique.

## D46 — Tela em linguagem simples: textos gerados por regras _(usuário)_
- **Decisão:** como tornar a tela compreensível para quem não é técnico.
- **Opções consideradas:** (a) textos gerados por **regras** a partir dos números da API; (b) textos
  escritos por um **modelo de linguagem** (Gemma local, Gemini).
- **Escolha:** (a) agora; (b) é melhoria futura no relatório final. Toda frase vem de
  `frontend/src/textos.ts` (com testes):
  - Cartões "Amanhã", "Em DD-MM-AAAA" e "Tendência"; parágrafos "Resumo" e "Dá para confiar?";
    conclusões na comparação, no teste, nos anos anteriores e no caso de estudo.
  - Linguagem simples: "erro médio" (MAE), "acertou a faixa em 9 de 10 dias" (cobertura),
    "18% melhor / empate / é a régua" (vs linha de base), "errou para baixo/cima" (viés).
  - Ícones **i** com explicação curta; RMSE, viés, configuração e largura da faixa recolhidos em
    "detalhes técnicos".
- **Regras das frases:**
  - Tendência = último dia previsto − último dado real: < 0,2 °C "estável"; 0,2–0,5 °C "leve
    alta/queda"; acima, "alta/queda".
  - Diferença com a regra simples < 3% = "empate"; melhor modelo a menos de 0,05 °C da regra
    simples = aviso "pode ser sorte".
  - Empates no menor erro (mesmo valor com 2 casas) são citados juntos.
  - Caso de estudo: "piorou" a partir de 1,3x (`LIMITE_PIOROU`); faixa que acertou metade dos dias
    ou menos = "confiante no nível errado"; mais da metade com erro alto = "só porque era larga".
  - Para o Chronos-2, "viu" em vez de "treinado" (ele não é treinado com os nossos dados).
  - **Temperaturas com 1 casa ("29,1 °C"); erros e variações com 2 ("0,38 °C")**, iguais às
    tabelas.
- **Por quê:** (a) é instantânea, gratuita e **sempre correta** — só afirma o que os números
  mostram. (b) escreve de forma mais natural, mas pode inventar, custa tempo e, no caso do Gemini,
  envia os dados para fora.

## D53 — Caso de estudo em um card só, com uma consulta _(usuário)_
- **Decisão:** como mostrar o caso de estudo na tela.
- **Opções consideradas:** (a) tabela de todos os modelos e gráfico de um modelo em lugares
  separados, com uma consulta para cada; (b) **um card só**, com uma consulta.
- **Escolha:** (b). Em cima, a tabela com todos os modelos (erro "só antes", "com tudo", quanto
  piorou, faixa "só antes"; contas em `casoGeral.ts`) — clicar num modelo seleciona. Embaixo, "Em
  detalhe: <modelo>", com texto, gráfico e cenários do modelo escolhido. `/api/caso-estudo` não
  tem parâmetro e sempre devolve os 5 modelos; a tela filtra (`CasoEstudo.tsx`).
- **Por quê:** o backend calcula as 15 combinações (3 cenários x 5 modelos) de uma vez de qualquer
  jeito; filtrar na tela evita outra consulta e trocar de modelo não chama a API de novo.

## D56 — Tipos sem campos "para API antiga" _(usuário)_
- **Decisão:** manter campos opcionais (`largura_faixa?`, `atualizacao?`) nos tipos do frontend
  para aguentar um backend antigo.
- **Opções consideradas:** (a) opcionais, com checagens espalhadas; (b) obrigatórios.
- **Escolha:** (b).
- **Por quê:** frontend e backend mudam juntos no mesmo repositório. Se um backend antigo
  responder, o limite de erro em volta da faixa de aviso (D45) esconde só a faixa, sem derrubar a
  página.

---

## Decisões que não valem mais

Saíram do texto acima. O número fica reservado (não é reaproveitado).

| Nº | O que era | Por que saiu | Substituída por |
|---|---|---|---|
| D02 | Prever duas séries: temperatura e sensação térmica | A sensação dobrava a complexidade sem lição nova | D52 |
| D09 | Pedido do caso de estudo "para as duas variáveis" | Juntada ao desenho do caso de estudo | D35 |
| D49 | Card "Visão geral dos modelos" com abas (Ranking, Caso de estudo, Anos anteriores) | O ranking saiu com a sensação (D52) e o caso de estudo virou um card só | D50, D53 |
