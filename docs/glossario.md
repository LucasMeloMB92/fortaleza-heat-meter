# Glossário

Termos do projeto explicados de forma simples. Novos termos são adicionados conforme aparecem.

---

## Dados e séries temporais

**Série temporal** — sequência de medições ordenadas no tempo, em intervalos regulares. Ex.: a
temperatura média de cada dia. A ordem importa: o valor de hoje depende dos dias anteriores.

**Série univariada x multivariada** — univariada tem uma única variável medida ao longo do tempo
(só a temperatura); multivariada usa várias juntas (temperatura + umidade + vento). Neste projeto
tratamos temperatura e sensação como **duas séries univariadas** separadas.

**Sensação térmica (temperatura aparente)** — a temperatura que o corpo "sente". Combina a
temperatura do ar com umidade, vento e radiação solar. Em lugares úmidos como Fortaleza, costuma
ficar acima da temperatura real.

**Variável exógena (externa)** — informação de fora da série usada para ajudar a prever.
Ex.: usar umidade e vento para prever a sensação. O problema: para prever o futuro, é preciso
saber também o valor futuro da variável externa. (Não usamos neste projeto — decisão D19.)

**Reanálise (ERA5)** — "histórico reconstruído" do clima: um modelo meteorológico é rodado de
novo sobre o passado, corrigido por todas as observações disponíveis (estações, satélites,
balões). É muito consistente, mas sai com alguns dias de atraso e tem grade grossa (~25 km).

**Modelo meteorológico / resolução de grade** — o modelo divide o mapa em quadrados (células) e
calcula um valor por célula. Quanto menor a célula (maior resolução), mais detalhes locais, como a
diferença entre a cidade e o mar ao lado.

**Viés** — erro sistemático, sempre para o mesmo lado. Ex.: a ERA5 pura fica, em média, 0,6 °C
abaixo do `best_match` em Fortaleza. Diferente do erro aleatório, que ora é para cima, ora para
baixo.

**Tendência** — direção de longo prazo da série (subindo, descendo ou estável).

**Sazonalidade** — padrão que se repete num período fixo. Ex.: mais calor de dia que à noite
(período de 24 h), mais calor no verão (período de 1 ano). Um ciclo semanal (7 dias) é comum em
vendas, mas não tem causa física em temperatura.

**Quebra estrutural** — mudança brusca no comportamento da série (nível, tendência ou
variabilidade). Depois dela, o passado deixa de ser um bom guia para o futuro, e um modelo
treinado com dados antigos pode errar.

## Validação e métricas

**Treino e teste (holdout)** — separamos os dados: o modelo aprende com o treino e é avaliado no
teste, que ele nunca viu. Em séries temporais o teste é sempre o **final** da série (o "futuro").

**Overfitting (sobreajuste)** — quando o modelo "decora" os dados de treino, inclusive o ruído,
e erra em dados novos. O risco cresce com muitos parâmetros e poucos dados (como nossos 90 dias).

**Horizonte de previsão** — quantos passos à frente prevemos (aqui, 7 dias).

**Linha de base (baseline)** — um modelo propositalmente simples (ex.: média dos últimos 7 dias)
que serve de régua. Se um modelo sofisticado não superar a linha de base, ele não vale a pena.

**MAE (Erro Absoluto Médio)** — média de quanto erramos, ignorando o sinal. Em °C. "Em média,
erramos 0,8 °C."

**RMSE (Raiz do Erro Quadrático Médio)** — parecido com o MAE, mas eleva os erros ao quadrado
antes de tirar a média; por isso, **pune mais os erros grandes**. Sempre ≥ MAE. Também em °C.

**Intervalo de confiança / de previsão** — faixa onde esperamos que o valor real caia, com certa
probabilidade (aqui, 95%). Uma faixa larga indica muita incerteza.

**Cobertura** — % de dias reais que caíram dentro da faixa prevista. Para um intervalo de 95%,
o ideal é perto de 95%. Muito abaixo: o modelo está confiante demais.

## Modelos

**ETS / Holt-Winters** — família de modelos de **suavização exponencial**: a previsão é uma média
ponderada do passado em que os dias mais recentes pesam mais. ETS = *Error, Trend, Seasonality*
(erro, tendência, sazonalidade), os componentes que o modelo pode ter.

**ARIMA** — modelo que prevê o próximo valor a partir dos valores anteriores (**AR**,
autorregressivo), de diferenças entre valores para remover tendência (**I**, integrado) e dos erros
anteriores (**MA**, média móvel). Configurado pelos números (p, d, q) — três "botões":

| Letra | Nome | Pergunta que responde |
|---|---|---|
| **p** | AR (autorregressivo) | Quantos **dias anteriores** uso para prever? |
| **d** | I (integrado) | Quantas vezes **transformo a série em diferenças** antes de modelar? |
| **q** | MA (média móvel) | Quantos **erros anteriores** uso para corrigir a previsão? |

Ex.: ARIMA(1, 1, 1) = usa 1 dia anterior, diferencia 1 vez, corrige pelo erro de 1 dia atrás.

**O "d" (ordem de diferenciação), com exemplo** — temperaturas de 5 dias: 28,8 → 29,1 → 29,2 →
29,3 → 29,1.
- **d = 0**: o modelo trabalha com os **valores** (28,8; 29,1; ...).
- **d = 1**: trabalha com as **variações diárias**: +0,3; +0,1; +0,1; −0,2. Para prever amanhã,
  prevê a variação e soma ao valor de hoje.

Diferenciamos quando a série "anda" sem rumo (o ARIMA precisa de algo que oscile em torno de um
valor estável). Se a série oscila em torno de uma **reta**, basta modelar a reta (d = 0 +
tendência) — diferenciar seria demais (ver "Sobrediferenciação").

**O "MA" (termo de média móvel), com exemplo** — corrige a previsão de hoje pelo erro de ontem.
Com coeficiente MA = 0,5: ontem o modelo previu 28,9 e o real foi 29,1 (erro +0,2) → a previsão
de hoje recebe um ajuste de 0,5 × 0,2 = **+0,1**. O coeficiente diz quanto do erro de ontem é
levado em conta: perto de 0 = ignora; positivo = "errei para baixo, subo um pouco"; negativo =
corrige no sentido oposto. (Não confundir com a "média móvel" usada para suavizar gráficos.)

**SARIMA** — ARIMA com uma parte **S**azonal extra, que olha para o mesmo ponto do ciclo anterior
(ex.: 7 dias atrás). Configurado por (p, d, q)(P, D, Q, s).

**Prophet** — biblioteca da Meta que decompõe a série em tendência + sazonalidades + feriados.
Pensada para séries longas (anos) com padrões claros; em 90 dias tem pouca informação para usar.

## Ferramentas e web

**Ambiente virtual (venv)** — pasta com um Python e bibliotecas exclusivos do projeto, para não
misturar versões com outros projetos.

**API REST** — forma de um programa oferecer dados a outro pela web: o cliente faz uma requisição
HTTP (ex.: `GET /api/previsao`) para uma rota e recebe uma resposta, geralmente em JSON.

**JSON** — formato de texto para dados estruturados (`{"temperatura": 27.4}`), entendido por
praticamente todas as linguagens.

**CORS** — regra de segurança do navegador que bloqueia uma página de chamar uma API em outra
origem (domínio/porta) sem permissão. O Flask-CORS faz a API dizer ao navegador "pode chamar".

**Linter (ruff)** — ferramenta que lê o código e aponta erros, más práticas e problemas de estilo
sem executá-lo.

## Open-Meteo (parâmetros usados)

**Parâmetro `models`** — escolhe qual modelo meteorológico fornece os números. Valores que usamos:
- **`era5`**: a reanálise ERA5 (ver "Reanálise"). Consistente, mas com ~6 dias de atraso e grade
  de ~25 km; em Fortaleza sai ~0,6 °C mais fria.
- **`best_match`** (padrão): o Open-Meteo escolhe o modelo mais adequado ao local, em geral de
  maior resolução. Vai até ontem e é igual à API de previsão.

**Parâmetro `past_days`** — só na API de previsão: "devolva também os N dias que já passaram",
calculados pelo modelo de previsão. Serve para tapar o atraso de uma fonte histórica.

**Resposta da API** — JSON com uma lista de datas (`time`) e, para cada variável, uma lista de
valores na mesma ordem. Dia sem dado vem como `null`.

## Exploração

**Média móvel** — média dos últimos N dias, recalculada a cada dia. Suaviza o sobe-e-desce e
revela a tendência. **Centrada** = usa dias antes e depois (só serve para olhar o passado).

**Defasagem (lag)** — distância no tempo. "Defasagem 1" = comparar cada dia com o dia anterior.

**Autocorrelação (ACF)** — o quanto a série se parece com ela mesma deslocada no tempo. ACF de
0,75 na defasagem 1 = hoje "lembra" bastante ontem. Vai de −1 a 1.

**Autocorrelação parcial (PACF)** — a autocorrelação "direta" numa defasagem, descontando o que já
é explicado pelas defasagens menores. Ex.: anteontem parece com hoje só porque passa por ontem?
Então a PACF de 2 dias é ~0. Ajuda a escolher a ordem AR (p) do ARIMA.

**Estacionariedade** — uma série é estacionária quando oscila em torno de um nível fixo, com
variação estável. Com tendência, não é. Muitos modelos (ARIMA) pedem série estacionária.

**Diferenciação** — trabalhar com a variação de um dia para o outro (hoje − ontem) em vez do
valor. Remove a tendência. É o "I" (integrado) do ARIMA, com ordem d.

**Teste ADF (Dickey-Fuller aumentado)** — teste estatístico de estacionariedade. Ponto de partida
("hipótese nula"): a série não é estacionária. p-valor < 0,05 → rejeitamos → estacionária.

**p-valor** — a chance de ver um resultado tão extremo quanto o observado se o ponto de partida do
teste fosse verdadeiro. Pequeno (< 0,05) = evidência contra o ponto de partida. Testes erram: com
o limite de 0,05, ~5% das vezes acusam algo que não existe.

**Força da sazonalidade** — número de 0 a 1 que mede quanto um padrão repetitivo (ex.: de 7 dias)
explica a variação. Perto de 0 = não há padrão.

**Climatologia ("normal")** — o valor típico para aquela época do ano, calculado com anos
anteriores. Aqui: média de 2024 e 2025 no mesmo dia.

**Anomalia** — diferença entre o valor observado e a climatologia. +0,8 °C = 0,8 °C mais quente
que o normal para a data. Remove o efeito da estação.

**Ponto de mudança** — data em que a série passa a se comportar de outro jeito (ex.: nível médio
mais alto). Detectá-lo é o primeiro passo para estudar uma quebra estrutural.

## Modelagem

**AIC / AICc** — "nota" de um modelo que soma o quanto ele erra nos dados de treino com uma multa
por cada parâmetro. Menor = melhor. Evita escolher sempre o modelo mais complexo (que decora o
ruído). **AICc** é a versão corrigida para poucos dados. Só compara modelos ajustados sobre os
mesmos dados.

AICc = erro no treino + multa por parâmetro + correção para poucos dados. Como ler a
**diferença** entre dois modelos (exemplos do nosso ranking da etapa 3):

| Diferença de AICc | Leitura | Exemplo |
|---|---|---|
| menos de 2 | praticamente empate | sensação: 99,60 x 100,19 |
| ~4 a 7 | vitória clara | temperatura: 43,59 x 47,79 |
| mais de 10 | o segundo é bem pior | — |

Por que não compara modelos com d diferente: com d = 1 o ajuste é medido sobre as variações; com
d = 0, sobre os valores — são "provas" diferentes. Por isso o d é escolhido por teste (D33).

**Parâmetro α (alfa, `smoothing_level`) do ETS** — de 0 a 1, o peso do dia mais recente. α
perto de 0: média longa, previsão estável. α perto de 1: quase "amanhã = hoje", e a incerteza
cresce rápido com a distância.

**Drift** — num modelo com d = 1, uma subida (ou descida) média constante por dia.

**Tendência linear (determinística)** — a série oscila em torno de uma reta. Diferente do drift:
a série sempre volta para perto da reta.

**Sobrediferenciação** — diferenciar uma série que não precisava. Sintoma típico: o termo MA
estimado fica perto de −1 (o modelo tenta desfazer a diferença). Analogia: converter reais em
dólares e logo em seguida converter de volta — um MA de −1 faz a conta contrária da
diferenciação e a anula. Aconteceu na etapa 3 com d = 1 fixo (D33).

**Teste de contrato** — teste que verifica se várias peças (aqui, os 4 modelos) respeitam o mesmo
"acordo" de entrada e saída. Se uma quebrar o acordo, quem a usa (API, métricas) quebra junto.

## Validação

**Vazamento de dados (data leakage)** — quando informação do período de teste "vaza" para o
treino (ex.: escolher a configuração olhando o teste). O resultado fica bom demais e não se repete
no futuro. Nosso teste anti-vazamento muda os valores do teste e confere que a previsão não muda.

**MAE relativo à linha de base** — (MAE do modelo ÷ MAE da linha de base − 1) × 100. −20% = o
modelo erra 20% menos que a regra simples; +13% = erra 13% mais (pior que a regra simples).

**Erro com sinal / viés na validação** — erro = previsão − real. Positivo = previu alto demais;
negativo = baixo demais. A média dos erros (viés) mostra se o modelo erra sempre para o mesmo lado.
Ex.: na temperatura, todos os modelos tiveram viés negativo — a alta continuou e eles previram
abaixo.

## Caso de estudo

**Regime** — o "jeito" como a série se comporta num período (nível médio, variação). Uma quebra
estrutural é uma troca de regime.

**Retreinar** — treinar o modelo de novo incluindo os dados mais recentes. É o principal remédio
contra quebras: o modelo "fica sabendo" do novo regime.

**Excesso de confiança (faixa estreita demais)** — quando a faixa de 95% deixa de fora muito mais
que 5% dos dias reais. O intervalo de um modelo só mede a incerteza **dentro do regime que ele
conhece**; ele não sabe que o mundo pode mudar. Ex.: o SARIMA "só antes" teve cobertura de 0%
(sensação) e 10% (temperatura).

**Reversão à média** — modelos sem tendência (ex.: SARIMA com d = 0 e sem tendência) puxam a
previsão de volta para a média do treino. Se o treino é de um regime antigo, puxam para o nível
errado.
