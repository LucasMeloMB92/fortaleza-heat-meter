# Relatório final — POC de previsão de temperatura em Fortaleza

> **Retrato de 26-11-2026.** Os números deste relatório usam os 90 dias de 28-08-2026 a
> 25-11-2026. A ferramenta atualiza os dados e retreina os modelos sozinha todo dia (D44), então a
> tela mostra sempre números atuais, que podem diferir dos daqui.
>
> **Atualização (evolução 11.2, 26-11-2026):** o **Chronos-2**, um modelo de IA moderna, entrou
> como 5º modelo, com os mesmos dados e o mesmo teste (D47). Os resultados dele estão nas seções
> 4 a 9 e o resumo da evolução está na 11.2.
>
> Os códigos entre parênteses (D07, D33...) apontam para as decisões detalhadas em
> [`decisoes.md`](decisoes.md). Este relatório se explica sozinho: não é preciso abrir outros
> arquivos para entendê-lo.

---

## Em poucas palavras

**O que fizemos.** Construímos uma ferramenta que olha os últimos 90 dias de temperatura e de
sensação térmica de Fortaleza e tenta adivinhar a próxima semana. Ela não dá só um número: dá
também uma **faixa** onde o valor real deve cair ("29,2 °C, provavelmente entre 28,1 e 29,6").
Comparamos cinco formas de prever — de uma regra simples ("repetir a média da última semana") até
uma IA moderna da Amazon — e, para saber qual funciona, escondemos os últimos 10 dias, pedimos a
previsão e conferimos com o que aconteceu de verdade.

**O que descobrimos.**
1. **Dá para prever melhor que a regra simples, mas o ganho é modesto.** Os melhores modelos
   erraram em média 0,3 °C por dia — até um terço menos que a regra simples. Fortaleza varia
   pouco, então todos erram pouco.
2. **O mais confiável é o SARIMA.** Ele não ganhou em tudo, mas foi bem nas duas variáveis. Um
   modelo que só às vezes é o melhor é arriscado para usar todo dia.
3. **A IA moderna empatou, não ganhou.** O Chronos-2 previu tão bem quanto os melhores sem
   aprender nada com os nossos dados — mas com uma faixa duas vezes mais larga, ou seja, menos
   útil. Com uma série curta e calma, a estatística clássica basta.
4. **Um modelo só conhece o passado que viu.** Quando o clima mudou de patamar em outubro, os
   modelos que não viram a mudança erraram de 2 a 6 vezes mais — e com falsa confiança. Por isso
   a ferramenta atualiza os dados e refaz os modelos sozinha, todo dia.
5. **Para o tempo em si, a meteorologia ganha.** Sites como o do Google simulam a atmosfera
   inteira; nossos modelos só olham o histórico. O valor deste trabalho está no **método**, que
   serve para números do negócio (vendas, demanda), onde não existe uma "simulação da atmosfera"
   para consultar.

---

## 1. Resumo executivo

- **O que foi feito:** uma ferramenta web que baixa os últimos 90 dias de temperatura média e
  sensação térmica média de Fortaleza, roda cinco modelos de previsão, prevê os próximos 7
  dias com uma faixa de incerteza e mostra tudo em gráficos e textos simples.
- **Quanto erra:** testados em 10 dias que não conheciam, os melhores modelos erraram em média
  **0,3 a 0,4 °C** por dia — de 15% a 33% menos que a regra simples "repetir a média da semana".
- **Modelo recomendado: SARIMA.** Não foi o melhor em tudo, mas foi o **mais consistente**: 3º
  lugar na temperatura (erro de 0,38 °C) e 1º na sensação térmica (0,29 °C), sempre melhor que a
  regra simples. O Prophet ganhou na temperatura (0,31 °C), mas foi o pior na sensação. Ranking
  completo dos cinco modelos na seção 7.
- **Principal lição:** um modelo só conhece o passado que viu. Quando o clima muda de patamar
  (como em meados de outubro de 2026), um modelo desatualizado erra de 2 a 6 vezes mais — e com
  falsa confiança. A ferramenta já se protege disso retreinando todo dia.
- **IA moderna x estatística clássica (Chronos-2):** o Chronos-2, uma rede neural da Amazon já
  treinada com milhões de séries, **empatou com o melhor** na temperatura (0,31 °C) e ficou no
  nível da regra simples na sensação (0,33 °C). Sem nenhum ajuste, ele chega perto dos melhores
  — mas com uma faixa de incerteza **quase duas vezes mais larga**. Não muda a recomendação
  (seção 11.2).

---

## 2. Objetivo

Provar, de ponta a ponta, o ciclo de uma previsão de série temporal pequena:

**dados → modelos → validação → previsão → tela**

Uma **série temporal** é uma sequência de valores medidos ao longo do tempo, em intervalos
regulares — aqui, um valor por dia. "Prever" é estimar os próximos valores a partir do
comportamento dos anteriores.

A pergunta central da POC: **com só 90 dias de histórico, dá para prever a próxima semana melhor
do que uma regra simples?** Resposta curta: sim, com ganho moderado (seção 6).

---

## 3. Dados

| Item | Valor |
|---|---|
| Local | Fortaleza-CE (lat −3,72, lon −38,54), fuso `America/Fortaleza` |
| Variáveis | Temperatura média diária e sensação térmica média diária |
| Período | 90 dias terminando **ontem** (hoje ainda está incompleto) — no retrato: 28-08-2026 a 25-11-2026 |
| Fonte | Open-Meteo, API histórica (`best_match`), gratuita e sem cadastro |
| Atualização | Automática: ao primeiro acesso do dia, a ferramenta baixa os dados novos e retreina |

**Sensação térmica** é a temperatura que o corpo "sente", combinando temperatura, umidade e vento.
Em Fortaleza ela fica ~2,7 °C acima da temperatura. As duas variáveis são previstas **de forma
independente**, cada uma só pelo seu próprio histórico.

**Como a série se comporta (90 dias):**

| °C | Temperatura | Sensação |
|---|---|---|
| Média | 28,15 | 30,87 |
| Variação típica (desvio-padrão) | 0,52 | 0,88 |
| Mínimo / máximo | 27,2 / 29,3 | 29,5 / 32,9 |

- **Fortaleza varia pouco:** a temperatura oscila tipicamente ±0,5 °C em torno da média. Por isso
  os erros dos modelos são pequenos em °C — e as diferenças entre eles também.
- **A série tem "memória":** o valor de hoje se parece muito com o de ontem (correlação de 0,75 na
  temperatura e 0,87 na sensação). É isso que torna a previsão possível.
- **Não há padrão semanal:** o clima não sabe que dia da semana é. Os modelos foram configurados
  sem ciclo de 7 dias.
- **2026 está mais quente que o normal:** comparando com o mesmo período de 2024 e 2025, 2026 está
  +0,66 °C acima na temperatura e +1,58 °C na sensação, e subiu mais um degrau em meados de
  outubro (base do caso de estudo, seção 8).

![Séries de 90 dias](img/etapa2_series.png)

![Contexto de 3 anos](img/etapa2_contexto.png)

*Os dados de 3 anos foram usados só para **entender** a série (estação x anomalia), nunca para
treinar os modelos.*

---

## 4. Gráficos da previsão

Previsão dos 7 dias seguintes (26-11-2026 a 02-12-2026) pelos cinco modelos, a partir dos 90
dias. A linha contínua é o histórico real; as tracejadas são as previsões; a área sombreada é a
**faixa de 95%** (explicada na seção 5.1).

![Previsões dos 5 modelos](img/etapa3_previsoes.png)

| Previsão (°C) | Temp. 26-11 | Temp. 02-12 | Sens. 26-11 | Sens. 02-12 |
|---|---|---|---|---|
| Linha de base | 29,06 | 29,06 | 32,16 | 32,16 |
| ETS | 29,07 | 29,07 | 32,04 | 32,04 |
| SARIMA | 29,09 | 29,26 | 32,04 | 32,23 |
| Prophet | 28,99 | 29,11 | 32,34 | 32,53 |
| Chronos-2 | 29,16 | 29,26 | 32,15 | 32,30 |

Último valor real (25-11-2026): 29,1 °C (temperatura) e 32,0 °C (sensação).

Os modelos se dividem em dois grupos: **linha de base e ETS** preveem estabilidade; **SARIMA,
Prophet e Chronos-2** prolongam a alta recente (≈ +0,1 a +0,2 °C na semana).

Na ferramenta web, o mesmo gráfico aparece para o modelo escolhido, com cartões de destaque
("Amanhã: 29,1 °C, entre 28,5 e 29,7") e um resumo em texto simples gerado com os números reais.

---

## 5. Como cada modelo foi decidido e configurado

Esta seção explica cada modelo do zero. Antes, quatro ideias que valem para todos.

### 5.1 Conceitos comuns

- **Treinar um modelo:** ajustar alguns números internos (os **parâmetros**) para que o modelo
  descreva bem o histórico. Ex.: "quanto o dia de ontem pesa na previsão de hoje".
- **Horizonte:** quantos dias à frente se prevê. Aqui, 7 dias (a ferramenta aceita de 1 a 14).
- **Faixa (intervalo) de 95%:** em vez de um número só, o modelo dá uma faixa onde o valor real
  deve cair em 95 de cada 100 previsões. Ex.: "29,1 °C, provavelmente entre 28,5 e 29,7 °C". Faixa
  estreita = modelo confiante. Quanto mais longe o dia previsto, mais larga a faixa.
- **Escolha automática da configuração:** ETS e SARIMA têm várias versões possíveis (com ou sem
  tendência etc.). Em vez de escolher à mão, a ferramenta treina todas as versões candidatas e
  fica com a de **menor AICc**, refazendo essa escolha a cada treino (D28).
  - **AICc** é uma "nota" para comparar versões de um modelo: soma o erro no histórico com uma
    **multa por complexidade** (cada parâmetro a mais custa pontos). Menor = melhor. Serve para
    não escolher um modelo que "decora" o histórico em vez de aprender o padrão. O "c" é uma
    correção para séries curtas como a nossa. Diferenças menores que 2 pontos são consideradas
    empate.
  - Ex.: versão A erra um pouco menos que a versão B, mas usa 3 parâmetros a mais. A multa pode
    fazer a B ganhar — a explicação mais simples que funciona é preferida.

### 5.2 Linha de base — a régua

- **O que é:** uma regra fixa, não um modelo estatístico: **a previsão para cada um dos próximos
  dias é a média dos últimos 7 dias.** Ex.: se a última semana teve média de 29,06 °C, a previsão
  é 29,06 °C para todos os 7 dias (uma reta horizontal).
- **Por que existe:** é a régua. Um modelo só vale a pena se errar menos que ela (D07).
- **Faixa de 95% (D29):** a regra não tem fórmula de incerteza, então a calculamos pelo próprio
  passado: aplicamos a regra em todos os dias do histórico, medimos quanto ela errou 1, 2, ... 7
  dias depois e usamos esse tamanho de erro como faixa. É honesto (mostra o quanto a própria
  regra costuma errar) e a faixa cresce com a distância.
- **Configuração:** fixa — não há nada a escolher. Igual para as duas variáveis.

### 5.3 ETS (suavização exponencial)

- **O que é:** uma média ponderada do passado em que **os dias recentes pesam mais** e o peso cai
  aos poucos para os dias antigos. É um modelo clássico dos anos 1950–60. "ETS" vem de *Error,
  Trend, Seasonality* (erro, tendência, sazonalidade) — as três peças que ele pode ter.
- **O parâmetro principal, α (alfa):** um número entre 0 e 1 que diz quanto o modelo confia no
  último dia.
  - α perto de 1: "amanhã ≈ hoje" — reage rápido, mas é nervoso.
  - α perto de 0: "amanhã ≈ média de muitos dias" — estável, mas lento para perceber mudanças.
  - Ex.: com α = 0,3, o último dia pesa 30%, o anterior 21% (30% de 70%), o seguinte 15% e assim
    por diante.
- **Candidatos testados (D30):** sem tendência; com tendência (a previsão sobe ou desce em linha
  reta); com **tendência amortecida** (sobe ou desce, mas cada vez menos, até estabilizar).
  Nenhum com sazonalidade, porque não há ciclo semanal.
- **Escolhido pelo AICc:**

| | Temperatura | Sensação |
|---|---|---|
| Versão | sem tendência | sem tendência |
| α | **0,29** — média de vários dias | **0,89** — quase "amanhã = hoje" |

- **O que isso significa:** o ETS prevê uma reta horizontal (estabilidade). Na sensação, o α alto
  faz a faixa de 95% "explodir" de 1,7 °C para 4,2 °C de largura em 7 dias: como o modelo segue
  muito o último dia, ele admite que pode errar bastante mais à frente.
- **Ferramenta:** `ETSModel` da biblioteca statsmodels, que calcula a faixa de incerteza.

### 5.4 SARIMA

- **O que é:** o modelo clássico de séries temporais (método Box-Jenkins, anos 1970). O nome junta
  as peças que ele pode ter: **S**azonal + **AR** + **I** + **MA**. A configuração é escrita como
  SARIMA(p, d, q) — três números, explicados abaixo.
- **AR — autorregressivo (p):** a previsão usa os valores dos **p dias anteriores**. Ex.: com
  p = 1, "amanhã = uma fração de hoje + um ajuste". É a "memória" da série.
- **I — integrado (d):** quantas vezes a série é transformada em **variações diárias** antes de
  modelar. Com d = 0, o modelo olha os valores (29,1; 29,3; 29,2...). Com d = 1, olha as
  variações (+0,2; −0,1...). Usa-se d = 1 quando a série "passeia" sem voltar a um nível ou a uma
  reta.
- **MA — média móvel (q):** a previsão é corrigida pelo **erro dos q dias anteriores**. Ex.: com
  q = 1, se o modelo errou para baixo ontem, ele ajusta a previsão de hoje para cima.
- **Sazonal (S):** a repetição das peças acima em ciclos (ex.: a cada 7 dias). Entrou como
  candidata e **perdeu** — confirmou que não há ciclo semanal.
- **Tendência / drift:** uma inclinação constante somada à previsão. Com d = 0 chama-se
  **tendência linear** (a série oscila em torno de uma reta inclinada); com d = 1 chama-se
  **drift** (as variações diárias têm uma média diferente de zero, ex.: +0,03 °C por dia).
- **Como d é escolhido (D33):** por um teste estatístico, o **ADF** (Dickey-Fuller aumentado), que
  pergunta "a série volta sempre para uma reta?". Se a resposta for "sim" com segurança (p-valor
  menor que 0,05 — menos de 5% de chance de o teste estar enganado), usa-se d = 0 com tendência;
  senão, d = 1. Em seguida, o AICc escolhe p, q, a parte sazonal e a tendência entre **72
  combinações** (p e q de 0 a 2, com e sem parte sazonal, com e sem tendência — D31).
- **Escolhido (treino com os 90 dias):**

| | Temperatura | Sensação |
|---|---|---|
| Teste ADF | p = 0,17 → inconclusivo → d = 1 | p = 0,002 → volta para uma reta → d = 0 |
| Configuração | **SARIMA(1, 1, 1) + drift** | **SARIMA(1, 0, 0) + tendência linear** |
| Em palavras | variações diárias com memória de 1 dia, correção pelo erro de ontem e leve alta | valor de hoje puxa o de amanhã, em torno de uma reta levemente inclinada |
| Melhor versão *com* ciclo semanal | 3º lugar | 5º lugar |

- **Observação importante:** no treino da validação (só 80 dias), a temperatura passou no teste
  ADF e ficou com SARIMA(1, 0, 0) + tendência linear. **Com séries curtas, a configuração
  escolhida muda com poucos dias a mais ou a menos** — por isso a ferramenta refaz a escolha a
  cada treino, em vez de fixá-la.
- **O que isso significa:** o SARIMA parte do último valor real (memória de curto prazo) e
  prolonga a alta recente (+0,03 °C por dia), com a faixa mais estreita entre os modelos com
  memória.
- **Ferramenta:** `SARIMAX` da statsmodels, com busca própria das combinações.

### 5.5 Prophet

- **O que é:** um modelo da Meta (2017) que desenha a série como uma **soma de curvas**: uma
  tendência + ciclos (anual, semanal) + feriados. Foi feito para séries **longas** de negócio
  (anos de dados diários, com sazonalidades fortes). Entrou na POC **só como comparação**, para
  mostrar o que acontece quando a ferramenta não combina com o problema (D07).
- **Tendência por partes:** a tendência é uma linha que pode **mudar de inclinação** em alguns
  pontos (os "pontos de mudança"), que o próprio Prophet escolhe.
- **Configuração (D32), igual para as duas variáveis:** todas as sazonalidades **desligadas** —
  90 dias não contêm um ano inteiro (a sazonalidade anual seria inventada) e não há ciclo
  semanal. Sobra só a tendência por partes. Faixa de 95%; semente aleatória fixa para que a faixa
  (calculada por simulação) saia igual a cada execução.
- **Característica decisiva:** o Prophet **não tem memória de curto prazo** — ele desenha a linha
  de tendência sem olhar o último valor. Por isso começa a previsão em 28,99 °C (abaixo do último
  real, 29,1) na temperatura, e em 32,34 °C (acima do último real, 32,0) na sensação. Isso o ajuda
  quando a tendência continua e o atrapalha quando ela para.

### 5.6 Chronos-2 — IA moderna (evolução 11.2)

- **O que é:** uma **rede neural** da Amazon (2025). Rede neural é um programa com milhões de
  números internos ajustados para reconhecer padrões; o Chronos-2 tem cerca de 120 milhões. Ele é
  um **modelo fundacional**: já vem treinado pela Amazon com **milhões de séries de todo tipo**
  (vendas, energia, clima, tráfego) e aprendeu como séries costumam se comportar.
- **Diferença para os outros quatro:** ele **não é treinado com os nossos dados**. Recebe os 90
  valores como **contexto** (só os números — nem sabe que é temperatura) e projeta os próximos
  dias com o que já aprendeu. Na prática isso se chama **zero-shot**: prever uma série que o
  modelo nunca viu, sem nenhum ajuste. Não há configuração para escolher (nada de AICc).
- **Como sai a faixa de 95%:** o Chronos-2 não devolve uma média e uma faixa, e sim **quantis**.
  Um quantil é um valor de corte: o quantil de 2,5% é o valor com só 2,5% de chance de o real
  ficar abaixo dele. A previsão é o quantil de 50% (a **mediana**, o valor do meio), e a faixa vai
  do quantil de 2,5% ao de 97,5%. O modelo foi treinado para dar quantis de 1%, 5%, 10%... 95% e
  99%; os de 2,5% e 97,5% a biblioteca calcula entre os vizinhos (D47).
- **Configuração (D47):** versão **Chronos-2** (a mais nova; as menores, "Bolt", só dão faixas de
  até 80%, então não seriam comparáveis), rodando no processador comum (CPU), sem placa de vídeo.
  O modelo (456 MB) é baixado uma vez do Hugging Face (um repositório público de modelos); depois
  funciona sem internet. Os dados **não saem do computador**. Licença Apache 2.0: gratuito, com
  uso comercial permitido.
- **Características:** é rápido (0,06 s por previsão, contra ~17 s do SARIMA, que testa 72
  combinações) e dá sempre o mesmo resultado para a mesma série. Sua faixa é **assimétrica**
  (mais espaço abaixo da mediana do que acima) e **larga**: ele aprendeu com séries muito mais
  agitadas que a de Fortaleza e não estreita a faixa para a nossa série calma.

---

## 6. Comparação dos modelos

**Como testamos:** escondemos os últimos 10 dias (16-11-2026 a 25-11-2026), treinamos cada modelo
com os 80 dias anteriores (o Chronos-2 recebe esses 80 dias como contexto) e comparamos a previsão
com o que de fato aconteceu. Os modelos nunca
viram esses 10 dias — inclusive a escolha da configuração (AICc, ADF) usou só os 80 dias de treino.
Um teste automático garante isso.

**As medidas:**
- **Erro médio (MAE):** a média de quanto a previsão errou, em °C, sem olhar o sinal. "Errou em
  média 0,38 °C." É a medida principal.
- **RMSE:** parecido com o MAE, mas pune mais os erros grandes. Se o RMSE é bem maior que o MAE,
  houve alguns dias com erro grande.
- **Cobertura:** em quantos dos 10 dias o valor real caiu dentro da faixa de 95%. Uma faixa
  honesta acerta perto de 95%. Com 10 dias, cada dia vale 10 pontos.
- **Viés:** o erro médio **com sinal**. Negativo = o modelo previu abaixo do real (subestimou).
- **vs regra simples:** quanto o erro médio ficou menor (−) ou maior (+) que o da linha de base.

![Previsão x real no período de teste](img/etapa4_teste.png)

**Temperatura média**

| Modelo | Erro médio (MAE) | RMSE | Cobertura | Viés | vs regra simples |
|---|---|---|---|---|---|
| Linha de base | 0,46 °C | 0,55 | 7 de 10 dias | −0,24 | — |
| ETS | 0,43 °C | 0,53 | 9 de 10 dias | −0,20 | −6% |
| SARIMA | 0,38 °C | 0,50 | 9 de 10 dias | −0,10 | −18% |
| **Prophet** | **0,31 °C** | **0,46** | 9 de 10 dias | −0,01 | **−33%** |
| Chronos-2 | **0,31 °C** | 0,49 | 9 de 10 dias | +0,05 | −32% |

**Sensação térmica média**

| Modelo | Erro médio (MAE) | RMSE | Cobertura | Viés | vs regra simples |
|---|---|---|---|---|---|
| Linha de base | 0,34 °C | 0,49 | 10 de 10 dias | −0,24 | — |
| ETS | 0,33 °C | 0,42 | 10 de 10 dias | −0,03 | −2% |
| **SARIMA** | **0,29 °C** | 0,44 | 10 de 10 dias | −0,16 | **−15%** |
| Prophet | 0,38 °C | 0,43 | 10 de 10 dias | +0,19 | +13% (pior) |
| Chronos-2 | 0,33 °C | 0,44 | 10 de 10 dias | −0,05 | −1% (empate) |

**Largura média da faixa de 95% no teste (°C)** — quanto mais estreita, mais útil, desde que
acerte:

| | Linha de base | ETS | SARIMA | Prophet | Chronos-2 |
|---|---|---|---|---|---|
| Temperatura | 1,19 | 1,30 | 1,14 | 1,01 | **2,14** |
| Sensação | 2,21 | 3,42 | 2,02 | 1,66 | **4,05** |

**Leitura:**
- **Quase todos os modelos bateram a regra simples** — a exceção foi o Prophet na sensação.
  Entre ETS e linha de base a diferença (0,01–0,03 °C) é um empate prático.
- **Na temperatura, quem prolongou a alta errou menos:** a temperatura continuou subindo durante
  o teste (viés negativo em todos). Prophet e SARIMA, que seguem a tendência, ganharam.
- **Na sensação, o Prophet exagerou:** previu subida, e a sensação ficou estável nos últimos dias
  (viés +0,19). Sem memória de curto prazo, ele não percebeu que a alta tinha parado.
- **Um dia atípico:** 16-11-2026 teve 27,5 °C (provável dia de chuva). Todos os modelos erraram
  esse dia em +1,1 a +1,3 °C. Sem ele, o ranking da temperatura não muda.
- **Faixas honestas:** cobertura de 90–100% nos modelos, perto dos 95% prometidos. Só a linha de
  base na temperatura ficou abaixo (70%), porque a alta continuou nos últimos dias.
- **Chronos-2, a IA moderna:** sem nenhum treino, empatou com o Prophet na temperatura (0,31 °C) e
  ficou no nível da regra simples na sensação (0,33 °C). Acerta a faixa tanto quanto os outros,
  mas com uma faixa **quase duas vezes mais larga** — acertar uma faixa larga é fácil. Por isso a
  cobertura deve ser lida junto com a largura.

---

## 7. Modelo vencedor

**Recomendação: SARIMA**, com erro médio esperado de **~0,3 a 0,4 °C** por dia na próxima
semana. Abaixo, o ranking completo dos cinco modelos e o porquê da escolha.

### 7.1 Ranking em cada variável (erro médio no teste)

Posição pelo **erro médio (MAE)** — quanto a previsão errou, em média, nos 10 dias de teste.
Menor erro = melhor posição. "vs regra" = quanto o erro ficou menor (−) ou maior (+) que o da
regra simples.

| Posição | Temperatura | Erro | vs regra | Sensação | Erro | vs regra |
|---|---|---|---|---|---|---|
| 1º | Prophet | 0,31 °C | −33% | **SARIMA** | 0,29 °C | −15% |
| 2º | Chronos-2 | 0,31 °C | −32% | ETS | 0,33 °C | −2% |
| 3º | **SARIMA** | 0,38 °C | −18% | Chronos-2 | 0,33 °C | −1% |
| 4º | ETS | 0,43 °C | −6% | Linha de base | 0,34 °C | — |
| 5º | Linha de base | 0,46 °C | — | Prophet | 0,38 °C | +13% |

*Prophet e Chronos-2 empatam em 0,31 °C na temperatura; o Prophet fica na frente por milésimos.
O mesmo vale para ETS e Chronos-2 na sensação.*

O líder **muda** de uma variável para a outra: o Prophet vai do 1º ao 5º lugar. Só o SARIMA
fica entre os três primeiros nas duas.

### 7.2 Ranking geral (as duas variáveis juntas)

| Geral | Modelo | Posição média | Erro médio das duas | Bate a regra simples nas duas? | Largura média da faixa (temp. / sens.) | Caso de estudo "só antes" (temp. / sens.) |
|---|---|---|---|---|---|---|
| **1º** | **SARIMA** | **2,0** (3º e 1º) | 0,34 °C | **Sim, com folga** (−18% e −15%) | **1,14 / 2,02 °C** | 1,11 / 1,79 °C |
| 2º | Chronos-2 | 2,5 (2º e 3º) | **0,32 °C** | Só na temperatura (na sensação, empate: −1%) | 2,14 / 4,05 °C | 1,04 / 1,49 °C |
| 3º | Prophet | 3,0 (1º e 5º) | 0,35 °C | Não (+13% na sensação) | 1,01 / 1,66 °C | **0,31 / 0,35 °C** |
| 4º | ETS | 3,0 (4º e 2º) | 0,38 °C | Só na temperatura (na sensação, empate: −2%) | 1,30 / 3,42 °C | 0,95 / 1,36 °C |
| 5º | Linha de base | 4,5 (5º e 4º) | 0,40 °C | — (é a régua) | 1,19 / 2,21 °C | 0,94 / 1,29 °C |

Como ler as colunas:
- **Posição média:** a média das duas posições da tabela 7.1. Menor = mais regular. É o critério
  do ranking geral. No empate (Prophet e ETS, 3,0), desempata o erro médio.
- **Erro médio das duas:** a média simples dos dois erros. Mostra quem erra menos no total, mas
  não mostra se o modelo é regular.
- **Largura da faixa:** distância média entre o limite de cima e o de baixo da faixa de 95%. Faixa
  estreita que acerta = previsão útil; faixa larga "acerta" com facilidade, mas diz pouco.
- **Caso de estudo "só antes":** o erro do modelo que só conhecia os dias anteriores à mudança de
  outubro (seção 8). Mede como ele se sai quando o clima muda e ele não viu.

Na ferramenta web, este ranking aparece no topo da tela, no card **"Ranking geral dos modelos"**,
calculado com os números do dia e sem depender da variável escolhida.

### 7.3 Por que o SARIMA, e não os outros

- **SARIMA (1º):** é o mais **regular** — 3º e 1º lugar, e o único que bate a regra simples com
  folga nas duas variáveis. Tem a faixa mais estreita entre os modelos que nunca ficaram por
  último, e parte do último dia observado. O ponto fraco: é o que mais sofre quando o clima muda
  e ele não viu (1,11 e 1,79 °C) — por isso a ferramenta retreina todo dia.
- **Chronos-2 (2º):** tem o **menor erro médio somando as duas variáveis** (0,32 °C contra
  0,34 °C do SARIMA) — a diferença é de 0,02 °C, pequena demais para 10 dias de teste. Perde por
  dois motivos: na sensação empatou com a regra simples (−1%), e sua faixa é **quase o dobro** da
  do SARIMA. Uma previsão que diz "entre 30,6 e 34,0 °C" ajuda menos que uma que diz "entre 31,2 e
  33,3 °C". Para uma métrica nova, porém, é ótimo no primeiro dia: não exige escolher nada
  (seção 11.2).
- **Prophet (3º):** o melhor na temperatura, mas o **pior** na sensação, onde perdeu até para a
  regra simples. Ele segue a tendência sem olhar o último dia: acerta quando a tendência continua
  e erra quando ela para. É também por isso que foi o melhor no caso de estudo — a subida de
  outubro continuou. Num mês em que a tendência mude de direção, ele seria o primeiro a errar.
- **ETS (4º):** sempre um pouco melhor que a regra simples, mas tão pouco (−6% e −2%) que, na
  prática, é um empate. Tem a segunda faixa mais larga.
- **Linha de base (5º):** é a régua. Serve para saber se os outros valem a pena — e os outros
  quatro modelos ficaram, na média, à frente dela.

**Resumo:** para uma ferramenta que vai prever todos os dias, **regularidade e faixa útil valem
mais que o melhor número em um teste** — e é aí que o SARIMA ganha.

**Cuidados com esta conclusão:**
- É um teste de **10 dias**, numa fase de **subida sazonal** (agosto → novembro). Em dezembro,
  quando a temperatura estabiliza no pico do ciclo anual, modelos que prolongam a tendência podem
  passar do ponto.
- As diferenças entre modelos são de décimos de grau. Com mais tempo de uso, o ideal é repetir a
  comparação em várias semanas antes de fixar um vencedor.
- Na ferramenta, o usuário pode escolher qualquer um dos cinco modelos e ver o erro de cada um.

---

## 8. Caso de estudo: mudança brusca no clima (quebra estrutural)

**Quebra estrutural** é quando a série muda de patamar e passa a se comportar de outro jeito.
Em 2026, a anomalia (diferença em relação ao normal dos anos anteriores) subiu um degrau em
**15-10-2026** na temperatura (+0,49 → +0,86 °C) e em **23-10-2026** na sensação
(+1,35 → +1,96 °C). As datas foram encontradas automaticamente: o método testa cada data de corte
e escolhe a que melhor divide a série em dois trechos com médias diferentes (D26).

**A pergunta:** o que acontece com um modelo que não viu essa mudança?

**O experimento (D35):** cada modelo foi treinado de três jeitos e todos foram avaliados nos
mesmos 10 dias de teste (16-11-2026 a 25-11-2026):
- **Só antes:** treinado só com os dias anteriores à mudança (modelo "desatualizado");
- **Tudo:** treinado com todos os 80 dias de treino (o normal);
- **Só depois:** treinado só com os dias depois da mudança.

![Caso de estudo](img/etapa5_caso_estudo.png)

**Erro médio no teste (°C) e cobertura da faixa**

| Modelo | Temp. só antes | Temp. tudo | Temp. só depois | Sens. só antes | Sens. tudo | Sens. só depois |
|---|---|---|---|---|---|---|
| Linha de base | 0,94 (1/10) | 0,46 (7/10) | 0,46 (9/10) | 1,29 (5/10) | 0,34 (10/10) | 0,34 (9/10) |
| ETS | 0,95 (5/10) | 0,43 (9/10) | 0,31 (9/10) | 1,36 (10/10) | 0,33 (10/10) | 0,34 (10/10) |
| SARIMA | **1,11 (1/10)** | 0,38 (9/10) | 0,31 (9/10) | **1,79 (0/10)** | 0,29 (10/10) | 0,45 (8/10) |
| Prophet | 0,31 (9/10) | 0,31 (9/10) | 0,47 (6/10) | 0,35 (9/10) | 0,38 (10/10) | 0,30 (10/10) |
| Chronos-2 | 1,04 (10/10) | 0,31 (9/10) | 0,35 (9/10) | 1,49 (10/10) | 0,33 (10/10) | 0,33 (10/10) |

*No Chronos-2, "treinado com" quer dizer "recebeu como contexto": ele não é treinado.*

**O que aprendemos:**
1. **O modelo desatualizado erra muito e sempre para o mesmo lado.** Linha de base, ETS e SARIMA
   "só antes" erraram de **2 a 6 vezes mais** que com "tudo", sempre para baixo: continuaram
   prevendo o patamar antigo.
2. **A faixa de 95% não protege contra mudanças.** O SARIMA "só antes" acertou a faixa em 1 e
   0 de 10 dias: a faixa era estreita e confiante — no regime errado. Uma faixa só mede a
   incerteza do mundo que o modelo conhece.
3. **O Prophet sobreviveu, mas por sorte de calendário.** Mesmo treinado "só antes", ele aprendeu
   a subida de setembro/outubro e a prolongou — e a série continuou subindo. Um modelo de
   **tendência** sobrevive a uma mudança que continua a tendência; em dezembro, essa reta passaria
   do ponto.
4. **Descartar o passado ajuda às vezes, mas é arriscado.** "Só depois" melhorou ETS e SARIMA na
   temperatura, mas piorou o SARIMA na sensação (só 24 dias de treino = parâmetros instáveis).
   "Tudo" foi a escolha mais segura.
5. **A IA moderna também não percebe a mudança.** O Chronos-2 "só antes" errou 3 a 4 vezes mais
   que com "tudo", para baixo, como o SARIMA: ele só conhece o contexto que recebe. E acertou a
   faixa em 10 de 10 dias **mesmo errando o nível** — só porque a faixa era larga. Acertar a
   faixa não quer dizer que a previsão foi boa.

**Conclusão prática:** o remédio contra quebras é **retreinar com frequência**, não procurar o
modelo "perfeito". **A ferramenta já faz isso:** todo dia os dados são atualizados e os modelos
retreinados (D44).

*Observação: o caso de estudo é recalculado com os dados atuais. Quando a mudança de outubro sair
da janela de 90 dias, o detector ainda apontará alguma data, mesmo sem uma mudança forte — os
números da tela vão mudar em relação a este relatório.*

---

## 9. Isto é IA?

Depende do que se chama de "IA". Vale ser preciso para não criar expectativas erradas.

**O mapa:**

| Nível | Exemplos | Aprende com os dados? | Onde a POC está |
|---|---|---|---|
| 1. Regras fixas | "média dos últimos 7 dias" | Não | Linha de base |
| 2. Estatística clássica | ETS, SARIMA, Prophet | Sim — ajusta poucos parâmetros (2 a 6) só com os seus dados | **ETS, SARIMA, Prophet** |
| 3. Machine learning | gradient boosting, random forest | Sim — padrões mais livres, precisa de muito mais dados | — |
| 4. Deep learning / IA moderna | redes neurais; **modelos fundacionais** (Chronos, TimesFM) | Sim — treinados com milhões de séries (não com os seus) | **Chronos-2** |

- No sentido amplo, os níveis 2 a 4 são todos "aprendizado a partir de dados". No sentido comum
  do mercado, "IA" quer dizer os níveis 3 e 4.
- **Por que a POC usa estatística clássica (D07):** com 90 valores, machine learning e redes
  neurais próprias não têm dados suficientes e tendem a decorar o ruído. Para séries curtas, a
  estatística clássica costuma ser igual ou melhor, e é bem mais fácil de explicar.
- **A exceção são os modelos fundacionais:** como já vêm treinados com milhões de séries, eles
  conseguem prever uma série curta sem treino próprio. Por isso o Chronos-2 entrou como 5º modelo
  (seção 11.2) — e, nesta série, empatou com a estatística clássica, sem superá-la.

**Como descrever o projeto, de forma honesta:**

> "POC de previsão de séries temporais com modelos estatísticos que aprendem com o histórico
> (ETS, SARIMA e Prophet) e um modelo de IA moderna já treinado (Chronos-2), comparados a uma
> regra simples."

---

## 10. Limites da POC

- **Não enxerga umidade nem vento.** Eles influenciam a sensação térmica, mas para usá-los na
  previsão seria preciso saber a umidade e o vento *futuros* — que também teriam de ser previstos
  (D19). Temperatura e sensação são previstas de forma independente.
- **Não conhece o ciclo anual.** Fortaleza tem um ciclo de ~2 °C ao longo do ano, e 90 dias não
  mostram um ano inteiro. A alta de novembro de 2026 é em parte estação, que se estabiliza em
  dezembro — algo que os modelos não sabem (D23, D24).
- **A faixa de 95% não protege contra mudanças bruscas.** Um modelo desatualizado fica confiante no
  regime errado (seção 8). A atualização diária reduz esse risco, mas não o elimina no primeiro
  dia de uma mudança.
- **Teste curto.** A comparação usou 10 dias de uma única época do ano. Diferenças de décimos de
  grau entre modelos podem ser sorte.
- **Para prever o tempo em si, a previsão meteorológica é melhor.** Os serviços de meteorologia
  simulam a atmosfera inteira e nenhum modelo treinado só com o histórico de uma cidade os supera.
  O valor desta POC está no **método**, que serve para métricas onde não existe esse "modelo
  físico" (seção 11).
- **Números mudam com o tempo.** Este relatório é um retrato de 26-11-2026; a ferramenta mostra
  sempre os números atuais.
- **Roda localmente.** A ferramenta ainda não está publicada na internet.
- **O Chronos-2 pesa.** Exige o PyTorch (~200 MB) e o modelo (456 MB, baixado na primeira vez) e
  mais memória. A faixa dele é larga demais para esta série (seção 6).

---

## 11. Próximos passos

### 11.1 Já implementado: retreinar todo dia
O principal remédio contra quebras estruturais (seção 8) já está na ferramenta: a cada dia, os
dados são atualizados até ontem e os modelos retreinados, sem ação manual (D44).

### 11.2 Feito: Chronos-2 (IA moderna) como 5º modelo
O **Chronos-2** (Amazon) entrou como 5º modelo pela interface comum (D27, D47) e aparece
sozinho na validação, no caso de estudo, na API e na tela. Como funciona: seção 5.6.

**A pergunta era: "IA moderna ganha da estatística clássica nesta série?" Resposta: não — empata.**

| | Temperatura | Sensação | Largura da faixa |
|---|---|---|---|
| Chronos-2 | 0,31 °C (empate com o melhor, Prophet) | 0,33 °C (empate com a regra simples) | a maior: ~2x |
| Melhor clássico | 0,31 °C (Prophet) | 0,29 °C (SARIMA) | — |

- **Onde ele brilha:** zero-shot (sem treino nem escolha de configuração) e rápido (0,06 s). Numa
  **métrica nova do cliente**, é um ótimo primeiro resultado no primeiro dia, enquanto não há
  histórico para comparar modelos.
- **Onde ele perde:** faixa larga demais para uma série calma; não percebe mudanças de patamar
  que não estejam no contexto (seção 8).
- **Custo:** gratuito (Apache 2.0, uso comercial permitido — confirmar antes de usar em produto).
  O custo é técnico: PyTorch (~200 MB), o modelo (456 MB) e mais memória.
- **Próximo teste possível com ele:** repetir a comparação em várias semanas (o teste de 10
  dias é curto). A largura da faixa já virou métrica oficial da ferramenta (D48).

### 11.3 Explicações em texto por IA
Hoje os textos da tela são gerados por **regras** (D46): sempre corretos, mas fixos. Uma melhoria é
um **modelo de linguagem** escrever a explicação de forma mais natural e responder perguntas ("por
que o SARIMA ganhou?"):
- **Gemma via Ollama:** gratuito, roda no computador, os dados não saem.
- **Gemini, camada gratuita:** mais capaz, mas com limites de uso e dados enviados ao Google (ler
  os termos antes de usar com dados do cliente).

Cuidados: o texto pode inventar ou exagerar (conferir contra os números), leva segundos por texto
e envolve privacidade. O modelo de linguagem **explica** a previsão; ele **não** deve fazê-la —
para números, a ferramenta certa é o Chronos.

### 11.4 Outras métricas além do clima
É onde a previsão por séries temporais mais agrega valor. Exemplo genérico: **vendas diárias de
uma loja**, para planejar estoque e equipe na próxima semana.

O que já serve para qualquer métrica: os 5 modelos, a validação, o caso de estudo, a API, a tela,
a atualização automática e os testes. O que precisaria ser generalizado:

| Ponto | Hoje | Para qualquer métrica |
|---|---|---|
| Fonte de dados | Open-Meteo fixo | Envio de CSV, banco de dados ou API do cliente, num formato padrão (data, valor, nome da série) |
| Configuração | Duas variáveis fixas no código | Cadastro por métrica: nome, unidade (°C, R$, unidades), frequência, horizonte |
| Ciclo semanal | Desligado (o clima não tem) | Ligado conforme a métrica — vendas quase sempre têm. A busca do ETS e do SARIMA já testa ciclos de 7 dias |
| Feriados e datas especiais | Não usados | Importantes em negócio (Black Friday, Natal) — ponto forte do Prophet |
| Regras do negócio | Nenhuma | Ex.: vendas nunca negativas; muitos dias com zero |
| Caso de estudo | Compara com os anos anteriores (clima) | Detectar mudanças na própria série |
| Tela | "°C" fixo | Unidade vinda do cadastro da métrica |

### 11.5 Publicar online
- **Frontend:** arquivos estáticos gerados pelo build, hospedados de graça (Netlify, Vercel).
- **Backend:** servidor na nuvem com servidor de produção (gunicorn), ~2 GB de RAM (Prophet; mais
  com o Chronos), disco persistente para os dados que a atualização grava, endereço público
  liberado no CORS, HTTPS e "aquecimento" dos modelos ao iniciar, para o primeiro visitante não
  esperar ~1 minuto.

### 11.6 Com mais histórico (2 anos ou mais)
Usar o "normal" dos anos anteriores (climatologia) como régua, ligar a sazonalidade anual no
Prophet e validar em várias janelas de 7 dias, em vez de uma só (D23).
